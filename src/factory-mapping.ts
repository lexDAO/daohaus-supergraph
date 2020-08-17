import { BigInt, log, ByteArray, Address } from "@graphprotocol/graph-ts";
import { SummonMoloch } from "../generated/MolochSummoner/V2Factory";

import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";
import { createAndApproveToken, createEscrowTokenBalance, createGuildTokenBalance, createAndAddSummoner} from "./v2-mapping"


export function handleSummoned(event: SummonMoloch): void {
  
  MolochTemplate.create(event.params.baal);

  let molochId = event.params.baal.toHex();
  let moloch = new Moloch(molochId);
  let depositToken = event.params.depositToken;
  let approvedTokens: string[] = [];

  let escrowTokenBalance: string[] = [];
  let guildTokenBalance: string[] = [];

  approvedTokens.push(createAndApproveToken(molochId, depositToken));
  escrowTokenBalance.push(createEscrowTokenBalance(molochId, depositToken));
  guildTokenBalance.push(createGuildTokenBalance(molochId, depositToken));

  let eventSummoners = event.params.summoner;
  let summoners: string[] = [];

  let eventSummonerShares = event.params.summonerShares;


  

  moloch.summoner = summoners;
  moloch.summonerShares = new Array<i32>();
  moloch.summoningTime = event.params.summoningTime;
  moloch.version = "2x";
  moloch.deleted = false;
  moloch.newContract = "1";
  moloch.periodDuration = event.params.periodDuration;
  moloch.votingPeriodLength = event.params.votingPeriodLength;
  moloch.gracePeriodLength = event.params.gracePeriodLength;
  moloch.proposalDeposit = event.params.proposalDeposit;
  moloch.dilutionBound = event.params.dilutionBound;
  moloch.processingReward = event.params.processingReward;
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

  /*
  Used for summoning circle moloch
  moloch.summoningRate = event.params.summoningRate;
  moloch.summoningTermination = event.params.summoningTermination;
  */

  for (let i = 0; i < eventSummoners.length; i++) {
    let summoner = eventSummoners[i];
    let shares = eventSummonerShares[i];
    
    summoners.push(
      createAndAddSummoner(molochId, summoner, shares, depositToken, event)
    );
  }

  moloch.save();
}