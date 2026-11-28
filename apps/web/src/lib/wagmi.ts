import {createConfig} from "@privy-io/wagmi";
import {http} from "wagmi";
import {publicBuilderDataSuffix} from "./base/builder-code";
import {supportedChains} from "./chains";

const dataSuffix = publicBuilderDataSuffix();

export const wagmiConfig = createConfig({
    chains: supportedChains,
    transports: {
        [supportedChains[0].id]: http(),
        [supportedChains[1].id]: http(),
        [supportedChains[2].id]: http(),
    },
    ...(dataSuffix ? {dataSuffix} : {}),
});
