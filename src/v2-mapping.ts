import { BigInt, log, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  V2Moloch,
  SubmitProposal,
  SubmitVote,
  ProcessProposal,
  UpdateDelegateKey,
  SponsorProposal,
  ProcessWhitelistProposal,
  ProcessGuildKickProposal,
  ProcessActionProposal,
  Ragequit,
  CancelProposal,
  Withdraw,
  TokensCollected,
  ConvertSharesToLoot,
  StakeTokenForShares,
  Transfer,
  Approval
} from "../generated/templates/MolochTemplate/V2Moloch";
import { Erc20 } from "../generated/templates/MolochTemplate/Erc20";
import { Erc20Bytes32 } from "../generated/templates/MolochTemplate/Erc20Bytes32";

import {
  Moloch,
  Member,
  Token,
  TokenBalance,
  Proposal,
  Vote,
  RageQuit,
} from "../generated/schema";
import {
  addVotedBadge,
  addRageQuitBadge,
  addJailedCountBadge,
  addProposalSubmissionBadge,
  addProposalSponsorBadge,
  addMembershipBadge,
  addProposalProcessorBadge,
} from "./badges";
import { SummonMYSTIC } from "../generated/MolochSummoner/V2Factory";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let ESCROW = Address.fromString("0x000000000000000000000000000000000000deaf");
let GUILD = Address.fromString("0x000000000000000000000000000000000000dead");

function loadOrCreateTokenBalance(
  molochId: string,
  member: Bytes,
  token: string
): TokenBalance | null {
  let memberTokenBalanceId = token.concat("-member-").concat(member.toHex());
  let tokenBalance = TokenBalance.load(memberTokenBalanceId);
  let tokenBalanceDNE = tokenBalance == null ? true : false;
  if (tokenBalanceDNE) {
    createMemberTokenBalance(molochId, member, token, BigInt.fromI32(0));
    return TokenBalance.load(memberTokenBalanceId);
  } else {
    return tokenBalance;
  }
}

export function addToBalance(
  molochId: string,
  member: Bytes,
  token: string,
  amount: BigInt
): string {
  let tokenBalanceId = token.concat("-member-").concat(member.toHex());
  let balance: TokenBalance | null = loadOrCreateTokenBalance(
    molochId,
    member,
    token
  );
  balance.tokenBalance = balance.tokenBalance.plus(amount);
  balance.save();
  return tokenBalanceId;
}
function subtractFromBalance(
  molochId: string,
  member: Bytes,
  token: string,
  amount: BigInt
): string {
  let tokenBalanceId = token.concat("-member-").concat(member.toHex());
  let balance: TokenBalance | null = loadOrCreateTokenBalance(
    molochId,
    member,
    token
  );
  balance.tokenBalance = balance.tokenBalance.minus(amount);
  balance.save();
  return tokenBalanceId;
}

function internalTransfer(
  molochId: string,
  from: Bytes,
  to: Bytes,
  token: string,
  amount: BigInt
): void {
  subtractFromBalance(molochId, from, token, amount);
  addToBalance(molochId, to, token, amount);
}

export function createMemberTokenBalance(
  molochId: string,
  member: Bytes,
  token: string,
  amount: BigInt
): string {
  let memberId = molochId.concat("-member-").concat(member.toHex());
  let memberTokenBalanceId = token.concat("-member-").concat(member.toHex());
  let memberTokenBalance = new TokenBalance(memberTokenBalanceId);
  log.info('My token creatMemberTokenBalance amt is: {}', [amount.toString()])

  memberTokenBalance.moloch = molochId;
  memberTokenBalance.token = token;
  memberTokenBalance.tokenBalance = amount;
  log.info('My token tokenBalance is: {}', [memberTokenBalance.tokenBalance.toString()])
  memberTokenBalance.member = memberId;
  memberTokenBalance.guildBank = false;
  memberTokenBalance.ecrowBank = false;
  memberTokenBalance.memberBank = true;

  memberTokenBalance.save();
  return memberTokenBalanceId;
}

export function createEscrowTokenBalance(
  molochId: string,
  token: Bytes
): string {
  let memberId = molochId.concat("-member-").concat(ESCROW.toHex());
  let tokenId = molochId.concat("-token-").concat(token.toHex());
  let escrowTokenBalanceId = tokenId.concat("-member-").concat(ESCROW.toHex());
  let escrowTokenBalance = new TokenBalance(escrowTokenBalanceId);
  escrowTokenBalance.moloch = molochId;
  escrowTokenBalance.token = tokenId;
  escrowTokenBalance.tokenBalance = BigInt.fromI32(0);
  escrowTokenBalance.member = memberId;
  escrowTokenBalance.guildBank = false;
  escrowTokenBalance.ecrowBank = true;
  escrowTokenBalance.memberBank = false;

  escrowTokenBalance.save();
  return escrowTokenBalanceId;
}

export function createGuildTokenBalance(
  molochId: string,
  token: Bytes
): string {
  let memberId = molochId.concat("-member-").concat(GUILD.toHex());
  let tokenId = molochId.concat("-token-").concat(token.toHex());
  let guildTokenBalanceId = tokenId.concat("-member-").concat(GUILD.toHex());
  let guildTokenBalance = new TokenBalance(guildTokenBalanceId);

  guildTokenBalance.moloch = molochId;
  guildTokenBalance.token = tokenId;
  guildTokenBalance.tokenBalance = BigInt.fromI32(0);
  guildTokenBalance.member = memberId;
  guildTokenBalance.guildBank = true;
  guildTokenBalance.ecrowBank = false;
  guildTokenBalance.memberBank = false;

  guildTokenBalance.save();
  return guildTokenBalanceId;
}
export function createAndApproveToken(molochId: string, token: Bytes): string {
  let tokenId = molochId.concat("-token-").concat(token.toHex());
  let createToken = new Token(tokenId);

  createToken.moloch = molochId;
  createToken.tokenAddress = token;
  createToken.whitelisted = true;

  let erc20 = Erc20.bind(token as Address);
  let symbol = erc20.try_symbol();
  if (symbol.reverted) {
    log.info("symbol reverted molochId {}, token, {}", [
      molochId,
      token.toHexString(),
    ]);

    let erc20Bytes32 = Erc20Bytes32.bind(token as Address);
    let otherSymbol = erc20Bytes32.try_symbol();
    if (otherSymbol.reverted) {
      log.info("other symbol reverted molochId {}, token, {}", [
        molochId,
        token.toHexString(),
      ]);
    } else {
      createToken.symbol = otherSymbol.value.toString();
    }
  } else {
    createToken.symbol = symbol.value;
  }

  let decimals = erc20.try_decimals();
  if (decimals.reverted) {
    log.info("decimals reverted molochId {}, token, {}", [
      molochId,
      token.toHexString(),
    ]);
  } else {
    createToken.decimals = BigInt.fromI32(decimals.value);
  }

  createToken.save();
  return tokenId;
}

// used to create multiple summoners at time of summoning
export function createAndAddSummoner(
  molochId: string,
  summoner: Address,
  shares: BigInt,
  depositToken: Address,
  event: SummonMYSTIC
): string {

  let memberId = molochId.concat("-member-").concat(summoner.toHex());
  let moloch = Moloch.load(molochId);
  let member = new Member(memberId);
  

  member.moloch = molochId;
  member.createdAt = event.block.timestamp.toString();
  member.molochAddress = event.params.mystic;
  member.memberAddress = summoner;
  member.delegateKey = summoner;
  member.shares = shares;
  member.loot = BigInt.fromI32(0);
  member.tokenTribute = BigInt.fromI32(0);
  member.didRagequit = false;
  member.isSummoner = true;
  member.exists = true;
  member.proposedToKick = false;
  member.kicked = false;

  //Set summoner summoner balances for approved tokens to zero
    let tokenId = molochId.concat("-token-").concat(depositToken.toHex());
    let amount = BigInt.fromI32(0);
    createMemberTokenBalance(molochId, summoner, tokenId, amount);
  
  member.save();

  addMembershipBadge(summoner);

  return memberId;
}


export function handleClaimShares (event: StakeTokenForShares): void {
  let molochId = event.address.toHexString();
  let member = Member.load(
    molochId.concat("-member-").concat(event.params.memberAddress.toHex())
  );
  //load moloch to get depositToken
  let moloch = Moloch.load(molochId);
  let stakeTokenId = moloch.stakeToken;

  let isNewMember = member != null && member.exists == true ? false : true;

      //CREATE MEMBER
      if (isNewMember) {
        // if member.exists == false the member entity already exists
        // because it was created in a cancelProposal situation
        let newMember = member;
  
        newMember.moloch = molochId;
        newMember.createdAt = event.block.timestamp.toString();
        newMember.molochAddress = event.address;
        newMember.memberAddress = event.params.memberAddress;
        newMember.delegateKey = event.params.memberAddress;
        newMember.shares = event.params.amount;
        newMember.loot = BigInt.fromI32(0);;
        newMember.tokenTribute = event.params.amount;
        newMember.didRagequit = false;
        newMember.proposedToKick = false;
        newMember.kicked = false;
        newMember.isSummoner = false;
        newMember.exists = true;
  
        newMember.save();
  
        addMembershipBadge(newMember.memberAddress);
  
        //ADD SHARES TO EXISTING MEMBER
      } else {
        member.shares = member.shares.plus(event.params.amount);
        member.save();
      }

  member.shares = member.shares.plus(event.params.amount);
  member.save();

  //update shares
  moloch.totalShares = moloch.totalShares.plus(event.params.amount);

  if (event.params.amount > BigInt.fromI32(0)) {
      addToBalance(molochId, GUILD, stakeTokenId, event.params.amount);
    }
  }

export function handleSubmitProposal(event: SubmitProposal): void {
  let molochId = event.address.toHexString();

  let newProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());

  let member = Member.load(
    molochId.concat("-member-").concat(event.params.applicant.toHex())
  );
  let noMember = member == null || member.exists == false;
  let requestingSharesOrLoot =
    event.params.sharesRequested > BigInt.fromI32(0) ||
    event.params.lootRequested > BigInt.fromI32(0);
  let newMember = noMember && requestingSharesOrLoot;
  

  // For trades, members deposit tribute in the token they want to sell to the dao, and request payment in the token they wish to receive.
  let trade =
    event.params.paymentToken != Address.fromI32(0) &&
    event.params.tributeToken != Address.fromI32(0) &&
    event.params.tributeOffered > BigInt.fromI32(0) &&
    event.params.paymentRequested > BigInt.fromI32(0);

  let flags = event.params.flags;

  let proposal = new Proposal(newProposalId);
  proposal.proposalId = event.params.proposalId;

  proposal.moloch = molochId;
  proposal.molochAddress = event.address;
  proposal.createdAt = event.block.timestamp.toString();
  proposal.member = memberId;
  proposal.memberAddress = event.params.memberAddress;
  proposal.delegateKey = event.params.delegateKey;
  proposal.applicant = event.params.applicant;
  proposal.proposer = event.transaction.from;
  proposal.sponsor = Address.fromString(ZERO_ADDRESS);
  proposal.sharesRequested = event.params.sharesRequested;
  proposal.lootRequested = event.params.lootRequested;
  proposal.tributeOffered = event.params.tributeOffered;
  proposal.tributeToken = event.params.tributeToken;
  proposal.paymentRequested = event.params.paymentRequested;
  proposal.paymentToken = event.params.paymentToken;
  proposal.startingPeriod = BigInt.fromI32(0);
  proposal.yesVotes = BigInt.fromI32(0);
  proposal.noVotes = BigInt.fromI32(0);
  proposal.sponsored = flags[0];
  proposal.processed = flags[1];
  proposal.didPass = flags[2];
  proposal.cancelled = flags[3];
  proposal.whitelist = flags[4];
  proposal.guildkick = flags[5];
  proposal.action = flags[6];
  proposal.standard = flags[7];
  proposal.newMember = newMember;
  proposal.trade = trade;
  proposal.yesShares = BigInt.fromI32(0);
  proposal.noShares = BigInt.fromI32(0);
  proposal.maxTotalSharesAndLootAtYesVote = BigInt.fromI32(0);
  proposal.details = event.params.details;
  proposal.data = event.params.data;

  // calculate times
  let moloch = Moloch.load(molochId);
  let votingPeriodStarts = moloch.summoningTime.plus(
    proposal.startingPeriod.times(moloch.periodDuration)
  );
  let votingPeriodEnds = votingPeriodStarts.plus(
    moloch.votingPeriodLength.times(moloch.periodDuration)
  );
  let gracePeriodEnds = votingPeriodEnds.plus(
    moloch.gracePeriodLength.times(moloch.periodDuration)
  );

  proposal.votingPeriodStarts = votingPeriodStarts;
  proposal.votingPeriodEnds = votingPeriodEnds;
  proposal.gracePeriodEnds = gracePeriodEnds;

  proposal.save();

  addProposalSubmissionBadge(event.transaction.from, event.transaction);

  // collect tribute from proposer and store it in Moloch ESCROW until the proposal is processed
  if (event.params.tributeOffered > BigInt.fromI32(0)) {
    let tokenId = molochId
      .concat("-token-")
      .concat(event.params.tributeToken.toHex());
    addToBalance(molochId, ESCROW, tokenId, event.params.tributeOffered);
  }
}

export function handleSubmitVote(event: SubmitVote): void {
  let molochId = event.address.toHexString();
  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());
  let proposalVotedId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let voteId = memberId
    .concat("-vote-")
    .concat(event.params.proposalId.toString());

  let vote = new Vote(voteId);

  vote.createdAt = event.block.timestamp.toString();
  vote.proposal = proposalVotedId;
  vote.member = memberId;
  vote.memberAddress = event.params.memberAddress;
  vote.molochAddress = event.address;
  vote.uintVote = event.params.uintVote;

  vote.save();

  addVotedBadge(
    event.params.memberAddress,
    event.params.uintVote,
    event.transaction
  );

  let moloch = Moloch.load(molochId);
  let proposal = Proposal.load(proposalVotedId);
  let member = Member.load(memberId);

  switch (event.params.uintVote) {
    case 1: {
      //NOTE: Vote.yes
      proposal.yesShares = proposal.yesShares.plus(member.shares);
      proposal.yesVotes = proposal.yesVotes.plus(BigInt.fromI32(1));
      //NOTE: Set maximum of total shares encountered at a yes vote - used to bound dilution for yes voters

      proposal.maxTotalSharesAndLootAtYesVote = moloch.totalLoot.plus(
        moloch.totalShares
      );
      //NOTE: Set highest index (latest) yes vote - must be processed for member to ragequit
      member.highestIndexYesVote = proposalVotedId;
      proposal.save();
      member.save();
      break;
    }
    case 2: {
      proposal.noShares = proposal.noShares.plus(member.shares);
      proposal.noVotes = proposal.noVotes.plus(BigInt.fromI32(1));
      proposal.save();
      break;
    }
    default: {
      //TODO: LOG AN ERROR, SHOULD BE A DEAD END CHECK uintVote INVARIANT IN CONTRACT
      break;
    }
  }
}

export function handleSponsorProposal(event: SponsorProposal): void {
  let molochId = event.address.toHexString();
  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());
  let sponsorProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());

  let moloch = Moloch.load(molochId);

  // collect proposal deposit from sponsor and store it in the Moloch until the proposal is processed
  addToBalance(molochId, ESCROW, moloch.depositToken, moloch.proposalDeposit);

  let proposal = Proposal.load(sponsorProposalId);

  if (proposal.newMember) {
    moloch.proposedToJoin = moloch.proposedToJoin.concat([sponsorProposalId]);
    moloch.save();
  } else if (proposal.whitelist) {
    moloch.proposedToWhitelist = moloch.proposedToWhitelist.concat([
      sponsorProposalId,
    ]);
    moloch.save();
  } else if (proposal.guildkick) {
    moloch.proposedToKick = moloch.proposedToKick.concat([sponsorProposalId]);

    let member = Member.load(memberId);
    member.proposedToKick = true;
    member.save();
    moloch.save();
  } else if (proposal.trade) {
    moloch.proposedToTrade = moloch.proposedToTrade.concat([sponsorProposalId]);
    moloch.save();
  } else {
    moloch.proposedToFund = moloch.proposedToFund.concat([sponsorProposalId]);
    moloch.save();
  }

  proposal.proposalIndex = event.params.proposalIndex;
  proposal.sponsor = event.params.memberAddress;
  proposal.sponsoredAt = event.block.timestamp.toString();
  proposal.startingPeriod = event.params.startingPeriod;
  proposal.sponsored = true;

  proposal.save();

  addProposalSponsorBadge(event.params.memberAddress, event.transaction);
}

export function handleProcessProposal(event: ProcessProposal): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let processProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let proposal = Proposal.load(processProposalId);

  let applicantId = molochId
    .concat("-member-")
    .concat(proposal.applicant.toHex());
  let member = Member.load(applicantId);

  let tributeTokenId = molochId
    .concat("-token-")
    .concat(proposal.tributeToken.toHex());
  let paymentTokenId = molochId
    .concat("-token-")
    .concat(proposal.paymentToken.toHex());

  let isNewMember = member != null && member.exists == true ? false : true;

  addProposalProcessorBadge(event.transaction.from, event.transaction);

  //NOTE: PROPOSAL PASSED
  if (event.params.didPass) {
    proposal.didPass = true;

    //CREATE MEMBER
    if (isNewMember) {
      // if member.exists == false the member entity already exists
      // because it was created in cancelProposal for a cancelled new member proposal
      let newMember = member;

      if (newMember == null) {
        newMember = new Member(applicantId);
      }

      newMember.moloch = molochId;
      newMember.createdAt = event.block.timestamp.toString();
      newMember.molochAddress = event.address;
      newMember.memberAddress = proposal.applicant;
      newMember.delegateKey = proposal.applicant;
      newMember.shares = proposal.sharesRequested;
      newMember.loot = proposal.lootRequested;

      let sharesOrLootRequested =
        proposal.sharesRequested > BigInt.fromI32(0) ||
        proposal.lootRequested > BigInt.fromI32(0);

      if (sharesOrLootRequested) {
        newMember.exists = true;
      } else {
        newMember.exists = false;
      }

      newMember.tokenTribute = BigInt.fromI32(0);
      newMember.didRagequit = false;
      newMember.proposedToKick = false;
      newMember.kicked = false;
      newMember.isSummoner = false;

      newMember.save();

      addMembershipBadge(proposal.applicant);

      //FUND PROPOSAL
    } else {
      member.shares = member.shares.plus(proposal.sharesRequested);
      member.loot = member.loot.plus(proposal.lootRequested);
      member.save();
    }

    //NOTE: Add shares/loot do intake tribute from escrow, payout from guild bank
    moloch.totalShares = moloch.totalShares.plus(proposal.sharesRequested);
    moloch.totalLoot = moloch.totalLoot.plus(proposal.lootRequested);
    internalTransfer(
      molochId,
      ESCROW,
      GUILD,
      tributeTokenId,
      proposal.tributeOffered
    );
    //NOTE: check if user has a tokenBalance for that token if not then create one before sending
    internalTransfer(
      molochId,
      GUILD,
      proposal.applicant,
      paymentTokenId,
      proposal.paymentRequested
    );

    //NOTE: PROPOSAL FAILED
  } else {
    proposal.didPass = false;
    // return all tokens to the applicant

    // create a member entity if needed for withdraw
    if (isNewMember) {
      let newMember = new Member(applicantId);

      newMember.moloch = molochId;
      newMember.createdAt = event.block.timestamp.toString();
      newMember.molochAddress = event.address;
      newMember.memberAddress = proposal.applicant;
      newMember.delegateKey = proposal.applicant;
      newMember.shares = BigInt.fromI32(0);
      newMember.loot = BigInt.fromI32(0);
      newMember.exists = false;
      newMember.tokenTribute = BigInt.fromI32(0);
      newMember.didRagequit = false;
      newMember.proposedToKick = false;
      newMember.kicked = false;

      newMember.save();
    }

    internalTransfer(
      molochId,
      ESCROW,
      proposal.applicant,
      tributeTokenId,
      proposal.tributeOffered
    );
  }

  //NOTE: fixed array comprehensions update ongoing proposals (that have been sponsored)
  if (proposal.trade) {
    moloch.proposedToTrade = moloch.proposedToTrade.filter(function(
      value,
      index,
      arr
    ) {
      return index > 0;
    });
  } else if (proposal.newMember) {
    moloch.proposedToJoin = moloch.proposedToJoin.filter(function(
      value,
      index,
      arr
    ) {
      return index > 0;
    });
  } else {
    moloch.proposedToFund = moloch.proposedToFund.filter(function(
      value,
      index,
      arr
    ) {
      return index > 0;
    });
  }
  proposal.processed = true;

  internalTransfer(
    molochId,
    ESCROW,
    event.transaction.from,
    moloch.depositToken,
    moloch.processingReward
  );
  internalTransfer(
    molochId,
    ESCROW,
    proposal.sponsor,
    moloch.depositToken,
    moloch.proposalDeposit.minus(moloch.processingReward)
  );

  moloch.save();
  proposal.save();
}

export function handleProcessWhitelistProposal(
  event: ProcessWhitelistProposal
): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let processProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let proposal = Proposal.load(processProposalId);

  let tokenId = molochId
    .concat("-token-")
    .concat(proposal.tributeToken.toHex());

  let token = Token.load(tokenId);

  let isNotWhitelisted =
    token != null && token.whitelisted == true ? false : true;

  addProposalProcessorBadge(event.transaction.from, event.transaction);

  //NOTE: PROPOSAL PASSED
  if (event.params.didPass) {
    proposal.didPass = true;

    //CREATE Token
    //NOTE: invariant no loot no shares,
    if (isNotWhitelisted) {
      createAndApproveToken(molochId, proposal.tributeToken);
      createEscrowTokenBalance(molochId, proposal.tributeToken);
      createGuildTokenBalance(molochId, proposal.tributeToken);
    }

    //NOTE: PROPOSAL FAILED
  } else {
    proposal.didPass = false;
  }
  //NOTE: can only process proposals in order.
  moloch.proposedToWhitelist = moloch.proposedToWhitelist.filter(function(
    value,
    index,
    arr
  ) {
    return index > 0;
  });
  proposal.processed = true;

  //NOTE: issue processing reward and return deposit
  internalTransfer(
    molochId,
    ESCROW,
    event.transaction.from,
    moloch.depositToken,
    moloch.processingReward
  );
  internalTransfer(
    molochId,
    ESCROW,
    proposal.sponsor,
    moloch.depositToken,
    moloch.proposalDeposit.minus(moloch.processingReward)
  );

  moloch.save();
  proposal.save();
}

export function handleProcessGuildKickProposal(
  event: ProcessGuildKickProposal
): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let processProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let proposal = Proposal.load(processProposalId);

  addProposalProcessorBadge(event.transaction.from, event.transaction);

  //PROPOSAL PASSED
  //NOTE: invariant no loot no shares,
  if (event.params.didPass) {
    proposal.didPass = true;
    //Kick member
    if (proposal.guildkick) {
      let memberId = molochId
        .concat("-member-")
        .concat(proposal.applicant.toHexString());
      let member = Member.load(memberId);
      let newLoot = member.shares;
      member.jailed = processProposalId;
      member.kicked = true;
      member.shares = BigInt.fromI32(0);
      member.loot = member.loot.plus(newLoot);
      moloch.totalLoot = moloch.totalLoot.plus(newLoot);
      moloch.totalShares = moloch.totalShares.minus(newLoot);

      member.save();

      addJailedCountBadge(proposal.applicant, event.transaction);
    }
    //PROPOSAL FAILED
  } else {
    proposal.didPass = false;
  }

  //NOTE: can only process proposals in order, test shift array comprehension might have tp sprt first for this to work
  moloch.proposedToKick = moloch.proposedToKick.filter(function(
    value,
    index,
    arr
  ) {
    return index > 0;
  });
  proposal.processed = true;

  //NOTE: issue processing reward and return deposit
  //TODO: fix to not use from address, could be a delegate emit member kwy from event
  internalTransfer(
    molochId,
    ESCROW,
    event.transaction.from,
    moloch.depositToken,
    moloch.processingReward
  );
  internalTransfer(
    molochId,
    ESCROW,
    proposal.sponsor,
    moloch.depositToken,
    moloch.proposalDeposit.minus(moloch.processingReward)
  );

  moloch.save();
  proposal.save();
}

export function handleProcessActionProposal(
  event: ProcessActionProposal
): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let processProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let proposal = Proposal.load(processProposalId);

  if (event.params.didPass) {
    proposal.didPass = true;
    // @DEV - how to reach arbitrary call data and convert it to actions???
    //PROPOSAL FAILED
  } else {
    proposal.didPass = false;
  }

  addProposalProcessorBadge(event.transaction.from, event.transaction);

  //NOTE: can only process proposals in order.
  moloch.proposedAction = moloch.proposedAction.filter(function(
    value,
    index,
    arr
  ) {
    return index > 0;
  });
  proposal.processed = true;

  //NOTE: issue processing reward and return deposit
  internalTransfer(
    molochId,
    ESCROW,
    event.transaction.from,
    moloch.depositToken,
    moloch.processingReward
  );
  internalTransfer(
    molochId,
    ESCROW,
    proposal.sponsor,
    moloch.depositToken,
    moloch.proposalDeposit.minus(moloch.processingReward)
  );

  moloch.save();
  proposal.save();
}

export function handleRagequit(event: Ragequit): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());
  let member = Member.load(memberId);

  let sharesAndLootToBurn = event.params.sharesToBurn.plus(
    event.params.lootToBurn
  );
  let initialTotalSharesAndLoot = moloch.totalShares.plus(moloch.totalLoot);

  member.shares = member.shares.minus(event.params.sharesToBurn);
  member.loot = member.loot.minus(event.params.lootToBurn);
  moloch.totalShares = moloch.totalShares.minus(event.params.sharesToBurn);
  moloch.totalLoot = moloch.totalLoot.minus(event.params.lootToBurn);

  let noSharesOrLoot = member.shares.equals(new BigInt(0)) && member.loot.equals(new BigInt(0));

  if(noSharesOrLoot) {
    member.exists = false;
  }

  // for each approved token, calculate the fairshare value and transfer from guildbank to user
  let tokens = moloch.approvedTokens;
  for (let i = 0; i < tokens.length; i++) {
    let token: string = tokens[i];

    let balance: TokenBalance | null = loadOrCreateTokenBalance(
      molochId,
      GUILD,
      token
    );

    let balanceTimesBurn = balance.tokenBalance.times(sharesAndLootToBurn);
    let amountToRageQuit = balanceTimesBurn.div(initialTotalSharesAndLoot);

    internalTransfer(
      molochId,
      GUILD,
      member.memberAddress,
      token,
      amountToRageQuit
    );
  }

  addRageQuitBadge(event.params.memberAddress, event.transaction);

  member.save();
  moloch.save();

  let rageQuitId = memberId
    .concat("-")
    .concat("rage-")
    .concat(event.block.number.toString());
  let rageQuit = new RageQuit(rageQuitId);
  rageQuit.createdAt = event.block.timestamp.toString();
  rageQuit.moloch = molochId;
  rageQuit.molochAddress = event.address;
  rageQuit.member = memberId;
  rageQuit.memberAddress = event.params.memberAddress;
  rageQuit.shares = event.params.sharesToBurn;
  rageQuit.loot = event.params.lootToBurn;

  rageQuit.save();
}

export function handleCancelProposal(event: CancelProposal): void {
  let molochId = event.address.toHexString();
  let processProposalId = molochId
    .concat("-proposal-")
    .concat(event.params.proposalId.toString());
  let proposal = Proposal.load(processProposalId);

  // Transfer tribute from ESCROW back to the applicant if there was tribute offered on the proposal
  if (proposal.tributeOffered > BigInt.fromI32(0)) {
    let applicantId = molochId
      .concat("-member-")
      .concat(proposal.applicant.toHex());
    let member = Member.load(applicantId);

    // Create a member entity to assign a balance until they widthdraw it. member.exists = false
    if (member == null) {
      let newMember = new Member(applicantId);

      newMember.moloch = molochId;
      newMember.createdAt = event.block.timestamp.toString();
      newMember.molochAddress = event.address;
      newMember.memberAddress = proposal.applicant;
      newMember.delegateKey = proposal.applicant;
      newMember.shares = BigInt.fromI32(0);
      newMember.loot = proposal.lootRequested;
      newMember.exists = false;
      newMember.tokenTribute = BigInt.fromI32(0);
      newMember.didRagequit = false;
      newMember.proposedToKick = false;
      newMember.kicked = false;

      newMember.save();
    }

    let tokenId = molochId
      .concat("-token-")
      .concat(proposal.tributeToken.toHex());

    internalTransfer(
      molochId,
      ESCROW,
      proposal.applicant,
      tokenId,
      proposal.tributeOffered
    );
  }

  proposal.cancelled = true;
  proposal.save();
}

export function handleUpdateDelegateKey(event: UpdateDelegateKey): void {
  let molochId = event.address.toHexString();
  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());
  let member = Member.load(memberId);
  member.delegateKey = event.params.newDelegateKey;
  member.save();
}

export function handleWithdraw(event: Withdraw): void {
  // let memberAddress = event.params.memberAddress;

  log.info(
    "***********handleWithdraw tx {}, ammount, {}, from {}, memberAddress {}",
    [
      event.transaction.hash.toHex(),
      event.params.amount.toString(),
      event.transaction.from.toHex(),
      event.params.memberAddress.toHex(),
    ]
  );

  let molochId = event.address.toHexString();

  let tokenId = molochId.concat("-token-").concat(event.params.token.toHex());

  if (event.params.amount > BigInt.fromI32(0)) {
    subtractFromBalance(
      molochId,
      event.params.memberAddress,
      tokenId,
      event.params.amount
    );
  }
}

export function handleTokensCollected(event: TokensCollected): void {
  let molochId = event.address.toHexString();
  let tokenId = molochId.concat("-token-").concat(event.params.token.toHex());

  addToBalance(molochId, GUILD, tokenId, event.params.amountToCollect);
}

export function handleTransfer(event: Transfer): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);
  
  if (event.params.sender.toHex() != ZERO_ADDRESS) {

    // First subtract loot from existing member
    let memberId = molochId
    .concat("-member-")
    .concat(event.params.sender.toHex());
    let member = Member.load(memberId);
    let lootToTransfer = event.params.amount;
    member.loot = member.loot.minus(lootToTransfer);
    member.save();

    // Then check whether recipient exists
    let recipientId = molochId
    .concat("-member-")
    .concat(event.params.recipient.toHex());
    let recipient = Member.load(recipientId);

    if (recipient == null) {
      let newMember = new Member(recipientId);

      newMember.moloch = molochId;
      newMember.createdAt = event.block.timestamp.toString();
      newMember.molochAddress = event.address;
      newMember.memberAddress = event.params.recipient;
      newMember.delegateKey = event.params.recipient;
      newMember.shares = BigInt.fromI32(0);
      newMember.loot = event.params.amount;
      newMember.exists = true;
      newMember.tokenTribute = BigInt.fromI32(0);
      newMember.didRagequit = false;
      newMember.proposedToKick = false;
      newMember.kicked = false;

      newMember.save();
    } else {
      recipient.loot = recipient.loot.minus(event.params.amount);
      recipient.save();
    }

  }
}

export function handleConvertSharesToLoot(event: ConvertSharesToLoot): void {
  let molochId = event.address.toHexString();
  let moloch = Moloch.load(molochId);

  let memberId = molochId
    .concat("-member-")
    .concat(event.params.memberAddress.toHex());
  let member = Member.load(memberId);

  let memberShares = member.shares;
  let memberLoot = member.loot;

  member.shares = memberShares.minus(event.params.amount)
  member.loot = memberLoot.plus(event.params.amount)

  member.save();

  let molochShares = moloch.totalShares;
  let molochLoot = moloch.totalLoot;

  moloch.totalShares = molochShares.minus(event.params.amount);
  log.info("other symbol reverted token, {}", [moloch.totalShares.toHex()]);
  moloch.totalLoot = molochLoot.plus(event.params.amount);

  moloch.save();
}

export function handleApproval(event: Approval): void {
  
  log.info(
    "***********handleWithdraw tx {}, ammount, {}, from {}, memberAddress {}",
    [
      event.transaction.hash.toHex(),
      event.params.amount.toString(),
      event.transaction.from.toHex(),
      event.params.spender.toHex(),
      event.params.amount.toHex(),
    ]
  );

}
