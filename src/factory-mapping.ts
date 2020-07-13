import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import { SummonMoloch } from "../generated/MolochSummoner/V2Factory";

import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";


export function handleSummoned(event: SummonMoloch): void {
  
  let entity = Moloch.load(event.params.moloch.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new Moloch(event.params.moloch.toHex())
  }

  MolochTemplate.create(event.params.moloch);
  let molochId = event.params.moloch.toHex();
  let moloch = new Moloch(molochId);

  moloch.summoningTime = BigInt.fromI32(1);
  moloch.version = "2x";
  moloch.periodDuration = BigInt.fromI32(1);
  moloch.votingPeriodLength = BigInt.fromI32(1);
  moloch.gracePeriodLength = BigInt.fromI32(1);
  moloch.proposalDeposit = BigInt.fromI32(1);
  moloch.dilutionBound = BigInt.fromI32(3);
  moloch.processingReward = BigInt.fromI32(1);
  moloch.approvedTokens = new Array<string>();
  moloch.guildTokenBalance = new Array<string>();
  moloch.escrowTokenBalance = new Array<string>();
  moloch.totalShares = BigInt.fromI32(0);
  moloch.summoningRate = BigInt.fromI32(1);
  moloch.summoningTermination = BigInt.fromI32(1);
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