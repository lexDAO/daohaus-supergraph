import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import {Register as RegisterV2} from "../generated/V2Factory/V2Factory";

import { MolochV2Template } from "../generated/templates";
import { Moloch, Member } from "../generated/schema";

import {
  createAndApproveToken,
  createEscrowTokenBalance,
  createGuildTokenBalance,
  createMemberTokenBalance,
} from "./v2-mapping";
import { addSummonBadge, addMembershipBadge } from "./badges";

export function handleSummoned(event: Summoned): void {
  MolochV2Template.create(event.params.moloch);

  let molochId = event.params.moloch.toHex();
  let moloch = new Moloch(molochId);
  let tokens = event.params.approvedTokens;
  let approvedTokens: string[] = [];
  let summoners: string[] = [];
  let escrowTokenBalance: string[] = [];
  let guildTokenBalance: string[] = [];


  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    approvedTokens.push(createAndApproveToken(molochId, token));
    escrowTokenBalance.push(createEscrowTokenBalance(molochId, token));
    guildTokenBalance.push(createGuildTokenBalance(molochId, token));
  }

  for (let i = 0; i < summoners.length; i++) {
    let summoner = summoners[i];
    summoners.push(createSummoner(molochId, summoner));
  }

  moloch.summoner = summoners;
  moloch.summoningTime = event.params._summoningTime;
  moloch.version = "2";
  moloch.newContract = "1";
  moloch.periodDuration = event.params._periodDuration;
  moloch.votingPeriodLength = event.params._votingPeriodLength;
  moloch.gracePeriodLength = event.params._gracePeriodLength;
  moloch.proposalDeposit = event.params._proposalDeposit;
  moloch.dilutionBound = event.params._dilutionBound;
  moloch.processingReward = event.params._processingReward;
  moloch.depositToken = approvedTokens[0];
  moloch.approvedTokens = approvedTokens;
  moloch.guildTokenBalance = guildTokenBalance;
  moloch.escrowTokenBalance = escrowTokenBalance;
  moloch.totalShares = summoners.length;
  moloch.summoningRate = event.params._summoningRate;
  moloch.summoningTermination = event.params._summoningTermination;
  moloch.totalLoot = BigInt.fromI32(0);
  moloch.proposalCount = BigInt.fromI32(0);
  moloch.proposalQueueCount = BigInt.fromI32(0);
  moloch.proposedToJoin = new Array<string>();
  moloch.proposedToWhitelist = new Array<string>();
  moloch.proposedToKick = new Array<string>();
  moloch.proposedToFund = new Array<string>();
  moloch.proposedToTrade = new Array<string>();

  moloch.save();

  addSummonBadge(event.params.summoners, event.transaction);

}

