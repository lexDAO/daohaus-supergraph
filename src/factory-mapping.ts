
import { BigInt, log, Address } from "@graphprotocol/graph-ts";
import { SummonMoloch } from "../generated/MolochSummoner/V2Factory";
import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";
import { createAndApproveToken, createEscrowTokenBalance, createGuildTokenBalance, createAndAddSummoner, addToBalance} from "./v2-mapping"


export function handleStarted(event: PartyStarted): void {

  
  MolochTemplate.create(event.params.baal);

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  let GUILD = Address.fromString("0x000000000000000000000000000000000000beef");

  let molochId = event.params.baal.toHex();
  let moloch = new Moloch(molochId);

  let approvedTokens: string[] = [];
  moloch.approvedTokens = approvedTokens;

  let depositToken = event.params.depositToken;
  approvedTokens.push(createAndApproveToken(molochId, depositToken));
  moloch.depositToken = approvedTokens[0];
  moloch.totalShares = BigInt.fromI32(0);
  let totalShares = moloch.totalShares;

  let escrowTokenBalance: string[] = [];
  let guildTokenBalance: string[] = [];


  escrowTokenBalance.push(createEscrowTokenBalance(molochId, depositToken));
  guildTokenBalance.push(createGuildTokenBalance(molochId, depositToken));

  let eventSummoners = event.params.summoner;
  let summoners: string[] = [];

  let eventSummonerShares = event.params.summonerShares;
  //let summonerShares: BigInt[] = [BigInt.fromI32([])];

  for (let i = 0; i < eventSummoners.length; i++) {
    let summoner = eventSummoners[i];
    
    for (let i = 0; i< eventSummonerShares.length; i++){
      let shares = eventSummonerShares[i];

      summoners.push(
        createAndAddSummoner(molochId, summoner, shares, depositToken, event, totalShares)
      );
    }
  }

  moloch.summoner = summoners;
  // @DEV - need to figure out a way to save this array of numbers, having issues with types and type conversions 
  //moloch.summonerShares = summonerShares;
  moloch.summoningTime = event.params.summoningTime;
  moloch.version = "2x";
  moloch.deleted = false;
  moloch.newContract = "1";
  moloch.periodDuration = event.params.periodDuration;
  log.info('Moloch period duration is: {}', [moloch.periodDuration.toString()])
  moloch.votingPeriodLength = event.params.votingPeriodLength;
  moloch.gracePeriodLength = event.params.gracePeriodLength;
  moloch.proposalDeposit = event.params.proposalDeposit;
  moloch.dilutionBound = event.params.dilutionBound;
  moloch.processingReward = event.params.processingReward;
  moloch.summoningDeposit = event.params.summoningDeposit;
  moloch.guildTokenBalance = guildTokenBalance;
  moloch.escrowTokenBalance = escrowTokenBalance;

  //moloch.totalShares = BigInt.fromI32(0);
  moloch.totalLoot = BigInt.fromI32(0);
  moloch.proposalCount = BigInt.fromI32(0);
  moloch.proposalQueueCount = BigInt.fromI32(0);
  log.info('Moloch proposal queue is: {}', [moloch.proposalQueueCount.toString()])
  moloch.proposedToJoin = new Array<string>();
  moloch.proposedToWhitelist = new Array<string>();
  moloch.proposedToKick = new Array<string>();
  moloch.proposedToFund = new Array<string>();
  moloch.proposedToTrade = new Array<string>();

  // Updates GUILD balance if there was a summoning deposit
  if (moloch.summoningDeposit > BigInt.fromI32(0)){
    addToBalance(molochId, GUILD, depositToken.toString(), event.params.summoningDeposit);
  }
  
  /*
  Used for summoning circle moloch
  moloch.summoningRate = event.params.summoningRate;
  moloch.summoningTermination = event.params.summoningTermination;
  */

  moloch.save();
}