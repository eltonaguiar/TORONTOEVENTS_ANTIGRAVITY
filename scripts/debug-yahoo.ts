
import { fetchStockData } from "./lib/stock-data-fetcher-enhanced";

async function test() {
    console.log("Testing Yahoo Fetch...");
    const data = await fetchStockData("AAPL");
    console.log("Result:", data);
}

test();
