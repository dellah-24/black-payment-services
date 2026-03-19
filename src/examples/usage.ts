/**
 * BlackPayments Wallet - Usage Examples
 * 
 * This file demonstrates how to use the BlackPayments Wallet
 */

import {
  BlackPaymentsWallet,
  WalletChain,
  createWallet,
  createWalletWithExistingSeed,
  generateMnemonic,
} from '../index';

/**
 * Example 1: Create a new wallet with multiple chains
 */
async function exampleCreateNewWallet() {
  console.log('=== Example 1: Create New Wallet ===\n');

  // Create wallet with support for Ethereum, Polygon, and BSC
  const wallet = await createWallet([
    WalletChain.ETHEREUM,
    WalletChain.POLYGON,
    WalletChain.BSC,
  ]);

  // Get addresses
  const addresses = wallet.getAllAddresses();
  console.log('Wallet Addresses:');
  for (const [chain, address] of Object.entries(addresses)) {
    console.log(`  ${chain}: ${address}`);
  }

  // Get mnemonic (save this securely!)
  console.log(`\nMnemonic: ${generateMnemonic()}`);
  console.log('⚠️  IMPORTANT: Save this mnemonic securely!');

  return wallet;
}

/**
 * Example 2: Import an existing wallet
 */
async function exampleImportWallet() {
  console.log('\n=== Example 2: Import Existing Wallet ===\n');

  // Import an existing 12 or 24-word seed phrase
  const existingMnemonic = 'your twelve word seed phrase here';
  
  const wallet = await createWalletWithExistingSeed(
    existingMnemonic,
    [WalletChain.ETHEREUM, WalletChain.POLYGON, WalletChain.BSC]
  );

  const address = wallet.getAddress(WalletChain.ETHEREUM);
  console.log(`Ethereum address: ${address}`);

  return wallet;
}

/**
 * Example 3: Check USDT balance
 */
async function exampleCheckBalance(wallet: BlackPaymentsWallet) {
  console.log('\n=== Example 3: Check Balance ===\n');

  // Check balance on Ethereum
  const balance = await wallet.getBalance(WalletChain.ETHEREUM);
  console.log(`Ethereum:`);
  console.log(`  Native: ${balance.formattedNativeBalance}`);
  console.log(`  USDT:   ${balance.formattedUSDTBalance}`);

  // Check balance on Polygon
  const polygonBalance = await wallet.getBalance(WalletChain.POLYGON);
  console.log(`\nPolygon:`);
  console.log(`  Native: ${polygonBalance.formattedNativeBalance}`);
  console.log(`  USDT:   ${polygonBalance.formattedUSDTBalance}`);
}

/**
 * Example 4: Send USDT
 */
async function exampleSendUSDT(wallet: BlackPaymentsWallet) {
  console.log('\n=== Example 4: Send USDT ===\n');

  // Recipient address
  const recipient = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
  
  // Amount: 10 USDT (6 decimals for most chains)
  const amount = 10_000_000n; // 10 USDT

  // First, quote the transfer to see fees
  const quote = await wallet.quoteUSDTTransfer(
    recipient,
    amount,
    WalletChain.ETHEREUM
  );
  console.log(`Estimated fee: ${quote.estimatedFeeFormatted}`);

  // Send the USDT
  const result = await wallet.sendUSDT({
    to: recipient,
    amount,
    chain: WalletChain.ETHEREUM,
  });

  console.log(`Transaction sent!`);
  console.log(`  Hash: ${result.hash}`);
  console.log(`  From: ${result.from}`);
  console.log(`  To:   ${result.to}`);
  console.log(`  Value: ${result.value}`);
}

/**
 * Example 5: Configure MoonPay for fiat on-ramp
 */
async function exampleMoonPay(wallet: BlackPaymentsWallet) {
  console.log('\n=== Example 5: MoonPay Fiat On-Ramp ===\n');

  // Configure MoonPay with your API keys
  wallet.configureMoonPay({
    apiKey: 'pk_live_xxxxx', // Your MoonPay API key
    secretKey: 'sk_live_xxxxx', // Your MoonPay secret key
  });

  // Generate a buy URL for $100 USDT
  const buyUrl = await wallet.getMoonPayBuyUrl({
    cryptoAsset: 'usdt',
    fiatCurrency: 'usd',
    fiatAmount: 10000n, // $100.00 in cents
    config: {
      theme: 'dark',
      redirectURL: 'https://yourapp.com/payment-complete',
    },
  });

  console.log(`Buy URL: ${buyUrl}`);
  console.log('Open this URL in a browser to complete the purchase');
}

/**
 * Example 6: Get all balances across chains
 */
async function exampleAllBalances(wallet: BlackPaymentsWallet) {
  console.log('\n=== Example 6: All Balances ===\n');

  const balances = await wallet.getAllBalances();
  
  console.log('Balances across all chains:');
  for (const balance of balances) {
    console.log(`\n${balance.chain.toUpperCase()}:`);
    console.log(`  Native: ${balance.formattedNativeBalance}`);
    console.log(`  USDT:   ${balance.formattedUSDTBalance}`);
  }
}

/**
 * Run all examples
 */
async function main() {
  try {
    // Example 1: Create new wallet
    const wallet = await exampleCreateNewWallet();

    // Example 2: Check balance
    await exampleCheckBalance(wallet);

    // Example 3: Get all balances
    await exampleAllBalances(wallet);

    // Example 4: Send USDT (uncomment to test)
    // await exampleSendUSDT(wallet);

    // Example 5: MoonPay (uncomment after configuring API keys)
    // await exampleMoonPay(wallet);

    // Clean up
    wallet.dispose();
    
    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export examples for use
export {
  exampleCreateNewWallet,
  exampleImportWallet,
  exampleCheckBalance,
  exampleSendUSDT,
  exampleMoonPay,
  exampleAllBalances,
  main,
};

// Run if executed directly
// main();
