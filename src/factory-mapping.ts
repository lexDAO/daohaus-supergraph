import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import { SummonMoloch, SummonMolochCall } from "../generated/MolochSummoner/V2Factory";
import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";
import {
  createAndApproveToken,
  createEscrowTokenBalance,
  createGuildTokenBalance,
  createAndAddSummoner
} from "./v2-mapping";

export function handleSummoning(call: SummonMolochCall): void {
  
  let id = call.transaction.hash.toHex();
  let moloch = new Moloch(id);
  //

  let tokens = call.inputs._approvedTokens;
  let approvedTokens: string[] = [];
  let escrowTokenBalance: string[] = [];
  let guildTokenBalance: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    approvedTokens.push(createAndApproveToken(id, token));
    escrowTokenBalance.push(createEscrowTokenBalance(id, token));
    guildTokenBalance.push(createGuildTokenBalance(id, token));
  }

  let eventSummoners = call.inputs._summoners;
  let summoners: string[] = [];

  for (let i = 0; i < eventSummoners.length; i++) {
    let summoner = eventSummoners[i];
    summoners.push(
      createAndAddSummoner(id, summoner as Bytes, tokens, call)
    );
  }

  moloch.summoners = summoners;
  
  moloch.version = "2x";
  moloch.periodDuration = call.inputs._periodDuration;
  moloch.votingPeriodLength = call.inputs._votingPeriodLength;
  moloch.gracePeriodLength = call.inputs._gracePeriodLength;
  moloch.proposalDeposit = call.inputs._proposalDeposit;
  moloch.dilutionBound = call.inputs._dilutionBound;
  moloch.processingReward = call.inputs._processingReward;
  moloch.depositToken = approvedTokens[0];
  moloch.approvedTokens = approvedTokens;
  moloch.guildTokenBalance = guildTokenBalance;
  moloch.escrowTokenBalance = escrowTokenBalance;
  moloch.totalShares = BigInt.fromI32(0);
  moloch.summoningRate = call.inputs._summoningRate;
  moloch.summoningTermination = call.inputs._summoningTermination;
  moloch.totalLoot = BigInt.fromI32(0);
  moloch.proposalCount = BigInt.fromI32(0);
  moloch.proposalQueueCount = BigInt.fromI32(0);
  moloch.proposedToJoin = new Array<string>();
  moloch.proposedToWhitelist = new Array<string>();
  moloch.proposedToKick = new Array<string>();
  moloch.proposedToFund = new Array<string>();
  moloch.proposedToTrade = new Array<string>();

  moloch.save();
}

export function handleSummoned(event: SummonMoloch): void {
  
  
  let moloch = Moloch.load(event.transaction.hash.toHex())
  MolochTemplate.create(event.params.moloch);
  
  let molochId = event.params.moloch.toHex();

  moloch.save();

}
 