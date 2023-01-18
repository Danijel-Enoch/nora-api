import { Connection, PublicKey, Context, AccountInfo } from "@solana/web3.js";
import { PricefeedConfig } from "./interfaces";
import { parsePriceData, PythHttpClient,getPythProgramKeyForCluster,PriceStatus,PythConnection, } from "@pythnetwork/client";
import { RedisConfig, RedisStore, createRedisStore } from "./redis";

export async function collectPricefeed(p: PricefeedConfig, r: RedisConfig) {
  // Create a new redis store for this pricefeed
  const store = await createRedisStore(r, p.pricefeedName);
  const pricefeedAddress = new PublicKey(p.pricefeedPk);
  const connection = new Connection(p.clusterUrl);
  const connection2 = new Connection("https://solana-mainnet.g.alchemy.com/v2/r3-VIvtGqsTO1l2Oh_0PFrmAkHit_bFO");
  const pythPublicKey = getPythProgramKeyForCluster("mainnet-beta")
  const pythClient = new PythHttpClient(connection, pythPublicKey);
  const pythClient2 = new PythHttpClient(connection2, pythPublicKey)


  async function saveDataToRedis(priceData:any,symbol:string){
    console.log(`${symbol}: $${priceData?.aggregate.price} \xB1$:${priceData?.aggregate.confidence}}`)
    const ts = Date.now();
     store.storePrice(priceData, ts);

  }


   async function subscribe() {
    let data = await pythClient.getData().catch(async(err)=> await pythClient2.getData());
  
    if (!data) {
      // Status 502 is a connection timeout error,
      // may happen when the connection was pending for too long,
      // and the remote server or a proxy closed it
      // let's reconnect
      await subscribe();
    } else if (!data) {
      // An error - let's show it
      //showMessage(response.statusText);
      // Reconnect in one second
      await new Promise(resolve => setTimeout(resolve, 1000));
      await subscribe();
    } else {
      // Get and show the message
      const priceData = data.productPrice.get("Crypto."+p.pricefeedName)
      await saveDataToRedis(priceData,p.pricefeedName)
      // Call subscribe() again to get the next message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await subscribe();
    }
  }
  
  subscribe();

  // Callback that fetches pricefeed data and stores in Redis
  // async function priceDataCallback(
  //   accountInfo: AccountInfo<Buffer>,
  //   context: Context
  // ) {
  //   const priceData = parsePriceData(accountInfo.data);
  //   console.log(`$${priceData.price} \xB1$${priceData.confidence}`);
  //   console.log(context.slot);
  //   const ts = Date.now();
  //   store.storePrice(priceData, ts);
  // }

  // // Streaming approach: fetch price data on account change via w
  // connection.onAccountChange(pricefeedAddress, priceDataCallback);
}
