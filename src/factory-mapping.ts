import { BigInt, log, Bytes, Address } from "@graphprotocol/graph-ts";
import { Summoned } from "../generated/MolochSummoner/V2Factory";

import { MolochTemplate } from "../generated/templates";
import { Moloch } from "../generated/schema";


export function handleSummoned(event: Summoned): void {
  
  let entity = Moloch.load(event.params.moloch.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new Moloch(event.params.moloch.toHex())
  }

  MolochTemplate.create(event.params.moloch);
  let molochId = event.params.moloch.toHex();
  let moloch = new Moloch(molochId);
  moloch.save();

  
}