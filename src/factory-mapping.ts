import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import { SummonMoloch } from "../generated/MolochSummoner/V2Factory";

import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";
import { createAndApproveToken, createEscrowTokenBalance, createGuildTokenBalance, createAndAddSummoner} from "./v2-mapping"


export function handleSummoned(event: SummonMoloch): void {
  
  MolochTemplate.create(event.params.moloch);

  let molochId = event.params.moloch.toHex();
  let moloch = new Moloch(molochId);
  let depositToken = event.params.depositToken;
  log.info('My value is: {}', [depositToken.toHexString()])
  let approvedTokens: string[] = [];

  let escrowTokenBalance: string[] = [];
  let guildTokenBalance: string[] = [];

  approvedTokens.push(createAndApproveToken(molochId, depositToken));
  escrowTokenBalance.push(createEscrowTokenBalance(molochId, depositToken));
  guildTokenBalance.push(createGuildTokenBalance(molochId, depositToken));

  let eventSummoners = event.params.summoners;
  let summoners: string[] = [];

  moloch.summoners = summoners;
  moloch.summoningTime = event.params.summoningTime;
  log.info('My summoningTime value is: {}', [moloch.summoningTime.toString()])
  moloch.version = "2x";
  moloch.deleted = false;
  moloch.newContract = "1";
  moloch.periodDuration = event.params.periodDuration;
  log.info('My period duration is: {}', [moloch.periodDuration.toString()])
  moloch.votingPeriodLength = event.params.votingPeriodLength;
  moloch.gracePeriodLength = event.params.gracePeriodLength;
  moloch.proposalDeposit = event.params.proposalDeposit;
  moloch.dilutionBound = event.params.dilutionBound;
  moloch.processingReward = event.params.processingReward;
  moloch.summoningRate = event.params.summoningRate;
  moloch.summoningTermination = event.params.summoningTermination;
  moloch.summoningDeposit = event.params.summoningDeposit;
  moloch.depositToken = depositToken.toString(); 
  moloch.guildTokenBalance = guildTokenBalance;
  moloch.escrowTokenBalance = escrowTokenBalance;
  moloch.totalShares = BigInt.fromI32(0);
  moloch.totalLoot = BigInt.fromI32(0);
  moloch.proposalCount = BigInt.fromI32(0);
  moloch.proposalQueueCount = BigInt.fromI32(0);
  log.info('My proposal queue is: {}', [moloch.proposalQueueCount.toString()])
  moloch.proposedToJoin = new Array<string>();
  moloch.proposedToWhitelist = new Array<string>();
  moloch.proposedToKick = new Array<string>();
  moloch.proposedToFund = new Array<string>();
  moloch.proposedToTrade = new Array<string>();

  for (let i = 0; i < eventSummoners.length; i++) {
    let summoner = eventSummoners[i];
    log.info('My summoner is: {}', [summoner.toHexString()])
    summoners.push(
      createAndAddSummoner(molochId, summoner, depositToken, event)
    );
  }

  moloch.save();
}