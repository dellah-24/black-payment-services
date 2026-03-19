/**
 * BlackPayments Wallet - Local Test Script
 * 
 * Run with: npx ts-node src/test-local.ts
 */

import { 
  createWallet, 
  createWalletWithExistingSeed,
  WalletChain,
  BlackPaymentsWallet 
} from './index';

async function testWallet() {
  console.log('🧪 BlackPayments Wallet Test\n');
  console.log('='.repeat(50));

  // Test 1: Create a new wallet
  console.log('\n1️⃣  Creating new wallet...\n');
  const wallet = await createWallet([
    WalletChain.ETHEREUM,
    WalletChain.POLYGON,
    WalletChain.BSC,
  ]);

  // Get addresses
  const addresses = wallet.getAllAddresses();
  console.log('� wallet Addresses:');
  for (const [chain, address] of Object.entries(addresses)) {
    console.log(`   ${chain}: ${address}`);
  }

  // Test 2: Check balances
  console.log('\n2️⃣  Checking balances (may fail if no RPC connection)...\n');
  try {
    const balance = await wallet.getBalance(WalletChain.ETHEREUM);
    console.log(`   ETH Balance: ${balance.formattedNativeBalance}`);
    console.log(`   USDT Balance: ${balance.formattedUSDTBalance}`);
  } catch (error) {
    console.log('   ⚠️  Could not fetch balance (RPC connection needed)');
    console.log('   Error:', (error as Error).message);
  }

  // Test 3: Validate address
  console.log('\n3️⃣  Validating addresses...');
  const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
  const isValid = wallet.isValidAddress(testAddress);
  console.log(`   Is "${testAddress}" valid? ${isValid}`);

  // Test 4: Import existing wallet
  console.log('\n4️⃣  Testing wallet import with existing seed...');
  const existingMnemonic = 'your twelve word seed phrase here';
  try {
    const importedWallet = await createWalletWithExistingSeed(existingMnemonic, [WalletChain.ETHEREUM]);
    console.log(`   ✅ Successfully imported wallet`);
    console.log(`   Address: ${importedWallet.getAddress(WalletChain.ETHEREUM)}`);
  } catch (error) {
    console.log(`   ⚠️  ${(error as Error).message}`);
  }

  // Clean up
  wallet.dispose();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test complete!\n');
  
  console.log('📝 Next steps:');
  console.log('   1. Add testnet funds to your wallet address');
  console.log('   2. Try checking balance again');
  console.log('   3. Try sending a test transaction');
}

// Run the test
testWallet().catch(console.error);
