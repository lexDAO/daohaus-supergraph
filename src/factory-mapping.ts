import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import {Register as RegisterV2} from "../generated/V2Factory/V2Factory";

import { MolochV2Template } from "../generated/templates";
import { Moloch, Member } from "../generated/schema";


export function handleSummoned(event: Summoned): void {
  MolochV2Template.create(event.params.moloch);

  let molochId = event.params.moloch.toHex();
  let moloch = new Moloch(molochId);
  moloch.save();

} 


