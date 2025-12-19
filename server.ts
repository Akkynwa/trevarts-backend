import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { encodeFunctionData } from 'viem';
import { signSmartContractData } from '@wert-io/widget-sc-signer';
import dotenv from 'dotenv';

dotenv.config();
const app = express();


// app.use(cors({ origin: true }));
// Allow everything for testing purposes
// app.use(cors({ origin: '*' }));
app.use(
  cors({
    origin: [
      'https://trevartsyemi.vercel.app',
      'http://localhost:5173'
    ],
  })
);

app.use(express.json());
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});
app.post('/api/wert/session', async (req, res) => {
  try {
    const { user_address, quantity = 1 } = req.body;
    
    // Validate address format
    if (!user_address || !user_address.startsWith('0x')) {
      return res.status(400).json({ error: 'Valid receiver address is required' });
    }

    const PRIVATE_KEY = process.env.WERT_PRIVATE_KEY!;
    const SC_ADDRESS = process.env.NFT_CONTRACT_ADDRESS!;

    // 1. Calculate Price ($50 per NFT)
    const UNIT_PRICE = 50;
    const TOTAL_USD = UNIT_PRICE * quantity;
    const ETH_PRICE = 3200; // In production, fetch this from a live API
    const totalEthAmount = parseFloat((TOTAL_USD / ETH_PRICE).toFixed(8));

    // 2. Encode the Mint function: mint(address to, uint256 quantity)
    const sc_input_data = encodeFunctionData({
      abi: [{
        inputs: [
          { name: "to", type: "address" },
          { name: "quantity", type: "uint256" }
        ],
        name: "mint",
        type: "function",
        stateMutability: "payable"
      }],
      functionName: 'mint',
      args: [user_address as `0x${string}`, BigInt(quantity)]
    });

    // 3. Generate the Secure Signature
    const signatureData = {
      address: user_address, // The destination wallet
      commodity: "ETH",
      commodity_amount: totalEthAmount,
      network: "sepolia", 
      sc_address: SC_ADDRESS,
      sc_input_data: sc_input_data,
    };

    const result = signSmartContractData(signatureData, PRIVATE_KEY);

    res.json({
      click_id: uuidv4(),
      signature: result.signature,
      sc_input_data,
      sc_address: SC_ADDRESS,
      fiat_amount: TOTAL_USD,
      eth_amount: totalEthAmount
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// app.listen(4000, () => console.log('🚀 Backend live on port 4000'));
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Backend live on port ${PORT}`);
});
