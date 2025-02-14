import { useWalletClient } from "wagmi";
import { ICreateJarFormInput } from "../../components/CreateJarForm";
import { useDeployment } from "./useDeployment";
import { ZERO_ADDRESS } from "../constants";
import { prepareWriteContract, writeContract } from "wagmi/actions";
import {
  encodeAbiParameters,
  isAddress,
  parseAbiParameters,
  parseEther,
} from "viem/utils";
import { useToast } from "@/components/ui/use-toast";

export const useMintNFTJar = () => {
  const walletClient = useWalletClient();
  const deployment = useDeployment();
  const { toast } = useToast();

  const mintCookieJarNFT = async (mintData: ICreateJarFormInput) => {
    console.log("mintData", mintData);

    if (!walletClient) {
      toast({
        variant: "destructive",
        title: "Oops! Not connected?",
        description: "We couldn't find a wallet",
      });
      return;
    }

    if (!deployment) {
      toast({
        variant: "destructive",
        title: "What? No contracts found!",
        description: "We couldn't find a deployment",
      });
      return;
    }

    const nftContract = deployment.find(
      (contract) => contract.contractName === "CookieNFT"
    );

    if (!nftContract) {
      toast({
        variant: "destructive",
        title: "What? No cookie minterƒ contract found!",
        description: "We couldn't find a minter contract for the cookie jar",
      });
      return;
    }

    if (
      !deployment.find(
        (contract) => contract.contractName === mintData.cookieJar
      )
    ) {
      toast({
        variant: "destructive",
        title: "What? No cookie jar implementation found!",
        description: "We couldn't find a cookie jar implementation",
      });
      return;
    }

    const value =
      mintData.donation &&
      mintData.donationAmount &&
      BigInt(mintData.donationAmount) > 0
        ? parseEther(mintData.donationAmount)
        : undefined;

    //   function cookieMint(
    //     address cookieJarImp,
    //     bytes memory _initializer,
    //     string memory details,
    //     address donationToken,
    //     uint256 donationAmount
    // )

    const implementationAddress = deployment.find(
      (contract) => contract.contractName === mintData.cookieJar
    )?.contractAddress;
    const initializer = encodeCookieMintParameters(mintData);

    // Details
    // "{\"type\":\"Baal\",\"name\":\"Moloch Pastries\",\"description\":\"This is where you add some more content\",\"link\":\"app.daohaus.club/0x64/0x0....666\"}";

    const details = {
      type: mintData.cookieJar,
      name: mintData.title,
      description: mintData.description,
      link: mintData.link,
    };

    console.log(mintData, details);

    const config = await prepareWriteContract({
      address: nftContract.contractAddress as `0x${string}`,
      abi: nftContract?.abi,
      functionName: "cookieMint",
      args: [
        implementationAddress,
        initializer,
        JSON.stringify(details),
        ZERO_ADDRESS, // donation in native token
        mintData.donationAmount,
      ],
      value,
    });

    return await writeContract(config);
  };

  return {
    mintCookieJarNFT,
  };
};

const encodeCookieMintParameters = (data: ICreateJarFormInput) => {
  // 0. address owner or safeTarget,
  // 1. uint256 _periodLength,
  // 2. uint256 _cookieAmount,
  // 4. address _cookieToken
  const owner = isAddress(data.receiver) ? data.receiver : ZERO_ADDRESS;
  const periodLength = BigInt(data.cookiePeriod);
  const cookieAmount = BigInt(data.cookieAmount);
  const cookieToken = isAddress(data.cookieToken)
    ? data.cookieToken
    : ZERO_ADDRESS;

  if (owner === ZERO_ADDRESS || periodLength === 0n || cookieAmount === 0n) {
    throw new Error("Invalid input");
  }

  // ERC20
  // 5. address _erc20addr,
  // 6. uint256 _threshold
  if (data.cookieJar === "ERC20CookieJar6551") {
    const erc20Token = isAddress(data.erc20Token)
      ? data.erc20Token
      : ZERO_ADDRESS;
    const erc20Threshold = BigInt(data.erc20Threshold);

    if (erc20Token === ZERO_ADDRESS || erc20Threshold === 0n) {
      throw new Error("Invalid input");
    }

    const parameters =
      "address owner, uint256 _periodLength, uint256 _cookieAmount, address _cookieToken, address _erc20addr, uint256 _threshold";
    return encodeAbiParameters(parseAbiParameters(parameters), [
      owner,
      periodLength,
      cookieAmount,
      cookieToken,
      erc20Token,
      erc20Threshold,
    ]);
  }

  // Baal
  // 5. address _dao,
  // 6. uint256 _threshold,
  // 7. bool _useShares,
  // 8. bool _useLoot

  // ERC721
  // 5. address _erc721addr,
  // 6. uint256 _threshold

  // List
  // 5. address[] _allowlist
};
