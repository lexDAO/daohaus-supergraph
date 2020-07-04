const fs = require("fs");
const yaml = require("js-yaml");

const config = {
  rinkeby: {
    v2FactoryAddress: "", 
    v2FactoryStartBlock: 6731901,
  },
  mainnet: {
    v2FactoryAddress: "0x416F9A966c4d3Bb501a9c8715Dd5954121120Dba",
    v2FactoryStartBlock: 10338274,
  },
};

const network = process.argv.slice(2)[0];

try {
  let fileContents = fs.readFileSync("./subgraph-template.yaml", "utf8");
  let data = yaml.safeLoad(fileContents);

  data.dataSources[1].network = network;
  data.dataSources[1].source.address = config[network].v2FactoryAddress;
  data.dataSources[1].source.startBlock = config[network].v2FactoryStartBlock;

  data.templates[0].network = network;
  data.templates[1].network = network;

  if (network !== "mainnet") {
    data.dataSources.splice(4);
  }

  let yamlStr = yaml.safeDump(data);
  fs.writeFileSync("subgraph.yaml", yamlStr, "utf8");

  console.log("Generated subgraph.yaml for " + network);
} catch (e) {
  console.log(e);
}
