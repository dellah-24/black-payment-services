/**
 * BlackPayments Wallet - React Native Example Screens
 * 
 * Example screens demonstrating how to use the wallet in React Native
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  useWallet,
  useBalance,
  useTransfer,
  useMoonPay,
  useAddressValidation,
} from './useBlackPaymentsWallet';
import { WalletChain } from '../wallet/types';

/**
 * Example: Wallet Setup Screen
 */
export function WalletSetupScreen() {
  const { wallet, isLoading, error, createNewWallet, importWallet } = useWallet([
    WalletChain.ETHEREUM,
    WalletChain.POLYGON,
    WalletChain.BSC,
  ]);

  const [seedPhrase, setSeedPhrase] = useState('');

  const handleCreateWallet = async () => {
    try {
      const newWallet = await createNewWallet([
        WalletChain.ETHEREUM,
        WalletChain.POLYGON,
        WalletChain.BSC,
      ]);
      
      Alert.alert(
        'Wallet Created!',
        `Your seed phrase is:\n\n${newWallet.getSeedPhrase()}\n\n⚠️ Save this securely!`,
        [{ text: 'I Saved It' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to create wallet');
    }
  };

  const handleImportWallet = async () => {
    if (!seedPhrase.trim()) {
      Alert.alert('Error', 'Please enter your seed phrase');
      return;
    }
    
    try {
      await importWallet(seedPhrase);
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to import wallet. Check your seed phrase.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>BlackPayments Wallet</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleCreateWallet}>
        <Text style={styles.buttonText}>Create New Wallet</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.label}>Import Existing Wallet</Text>
      <TextInput
        style={styles.input}
        value={seedPhrase}
        onChangeText={setSeedPhrase}
        placeholder="Enter your 12 or 24 word seed phrase"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={handleImportWallet}
      >
        <Text style={styles.buttonText}>Import Wallet</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

/**
 * Example: Wallet Home Screen (Balance Display)
 */
interface WalletHomeProps {
  wallet: ReturnType<typeof useWallet>['wallet'];
}

export function WalletHomeScreen({ wallet }: WalletHomeProps) {
  const [selectedChain, setSelectedChain] = useState<WalletChain>(WalletChain.ETHEREUM);
  const { balance, isLoading, refetch } = useBalance(wallet, selectedChain);
  const { addresses } = useWallet();

  const chains: WalletChain[] = [
    WalletChain.ETHEREUM,
    WalletChain.POLYGON,
    WalletChain.BSC,
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Wallet</Text>

      {/* Chain Selector */}
      <View style={styles.chainSelector}>
        {chains.map((chain) => (
          <TouchableOpacity
            key={chain}
            style={[
              styles.chainButton,
              selectedChain === chain && styles.chainButtonActive,
            ]}
            onPress={() => setSelectedChain(chain)}
          >
            <Text
              style={[
                styles.chainButtonText,
                selectedChain === chain && styles.chainButtonTextActive,
              ]}
            >
              {chain.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Balance Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>USDT Balance</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.balance}>
            {balance?.formattedUSDTBalance || '0.00 USDT'}
          </Text>
        )}
        
        <Text style={styles.cardLabel}>Native Balance</Text>
        <Text style={styles.nativeBalance}>
          {balance?.formattedNativeBalance || '0.000000 ETH'}
        </Text>
      </View>

      {/* Address */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Wallet Address</Text>
        <Text style={styles.address} selectable>
          {addresses[selectedChain] || 'Loading...'}
        </Text>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.button} onPress={refetch}>
        <Text style={styles.buttonText}>Refresh Balance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Example: Send USDT Screen
 */
interface SendScreenProps {
  wallet: ReturnType<typeof useWallet>['wallet'];
}

export function SendScreen({ wallet }: SendScreenProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState<WalletChain>(WalletChain.ETHEREUM);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  
  const { sendUSDT, quoteTransfer, isLoading, transaction } = useTransfer(wallet);
  const isValidAddress = useAddressValidation(wallet);

  const handleQuote = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please enter recipient and amount');
      return;
    }

    if (!isValidAddress(recipient, selectedChain)) {
      Alert.alert('Error', 'Invalid recipient address');
      return;
    }

    try {
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // 6 decimals for USDT
      const quote = await quoteTransfer(recipient, amountInWei, selectedChain);
      
      Alert.alert(
        'Confirm Transaction',
        `Send ${amount} USDT to ${recipient.slice(0, 6)}...${recipient.slice(-4)}?\n\nEstimated Fee: ${quote.estimatedFeeFormatted}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => setStep('confirm') },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to get quote');
    }
  };

  const handleSend = async () => {
    try {
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
      const result = await sendUSDT(recipient, amountInWei, selectedChain);
      
      setStep('success');
      Alert.alert('Success', `Transaction sent!\nHash: ${result.hash.slice(0, 10)}...`);
    } catch (err) {
      Alert.alert('Error', 'Transaction failed');
    }
  };

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>Transaction Sent!</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setStep('input');
            setRecipient('');
            setAmount('');
          }}
        >
          <Text style={styles.buttonText}>Send Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Send USDT</Text>

      {/* Chain Selector */}
      <View style={styles.chainSelector}>
        {[WalletChain.ETHEREUM, WalletChain.POLYGON, WalletChain.BSC].map((chain) => (
          <TouchableOpacity
            key={chain}
            style={[
              styles.chainButton,
              selectedChain === chain && styles.chainButtonActive,
            ]}
            onPress={() => setSelectedChain(chain)}
          >
            <Text
              style={[
                styles.chainButtonText,
                selectedChain === chain && styles.chainButtonTextActive,
              ]}
            >
              {chain.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recipient Input */}
      <Text style={styles.label}>Recipient Address</Text>
      <TextInput
        style={styles.input}
        value={recipient}
        onChangeText={setRecipient}
        placeholder="0x..."
        autoCapitalize="none"
      />

      {/* Amount Input */}
      <Text style={styles.label}>Amount (USDT)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      {/* Actions */}
      {step === 'input' ? (
        <TouchableOpacity style={styles.button} onPress={handleQuote}>
          <Text style={styles.buttonText}>Review Transaction</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleSend}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirm & Send</Text>
          )}
        </TouchableOpacity>
      )}

      {isLoading && <Text>Sending...</Text>}
    </ScrollView>
  );
}

/**
 * Example: Receive Screen
 */
interface ReceiveScreenProps {
  wallet: ReturnType<typeof useWallet>['wallet'];
}

export function ReceiveScreen({ wallet }: ReceiveScreenProps) {
  const [selectedChain, setSelectedChain] = useState<WalletChain>(WalletChain.ETHEREUM);
  const { addresses } = useWallet();

  const chains: WalletChain[] = [
    WalletChain.ETHEREUM,
    WalletChain.POLYGON,
    WalletChain.BSC,
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Receive USDT</Text>

      {/* Chain Selector */}
      <View style={styles.chainSelector}>
        {chains.map((chain) => (
          <TouchableOpacity
            key={chain}
            style={[
              styles.chainButton,
              selectedChain === chain && styles.chainButtonActive,
            ]}
            onPress={() => setSelectedChain(chain)}
          >
            <Text
              style={[
                styles.chainButtonText,
                selectedChain === chain && styles.chainButtonTextActive,
              ]}
            >
              {chain.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* QR Code Placeholder */}
      <View style={styles.qrPlaceholder}>
        <Text style={styles.qrText}>QR Code</Text>
        <Text style={styles.qrSubtext}>Scan to receive USDT</Text>
      </View>

      {/* Address */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your Address</Text>
        <Text style={styles.address} selectable>
          {addresses[selectedChain] || 'Loading...'}
        </Text>
      </View>

      <Text style={styles.hint}>
        Only send {selectedChain.toUpperCase()} USDT to this address
      </Text>
    </View>
  );
}

/**
 * Example: Buy/Sell with MoonPay
 */
interface FiatRampScreenProps {
  wallet: ReturnType<typeof useWallet>['wallet'];
}

export function FiatRampScreen({ wallet }: FiatRampScreenProps) {
  const { configure, buyUSDT, sellUSDT, isLoading } = useMoonPay(wallet);
  const [fiatAmount, setFiatAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState<WalletChain>(WalletChain.ETHEREUM);

  const handleBuy = async () => {
    // Configure with your MoonPay API keys
    configure({
      apiKey: 'pk_test_xxx', // Use test key for development
    });

    try {
      const buyUrl = await buyUSDT({
        cryptoAsset: 'usdt',
        fiatCurrency: 'usd',
        fiatAmount: BigInt(Math.floor(parseFloat(fiatAmount) * 100)), // Convert to cents
        chain: selectedChain,
        config: {
          theme: 'dark',
        },
      });

      // Open the MoonPay widget
      Linking.openURL(buyUrl);
    } catch (err) {
      Alert.alert('Error', 'Failed to create buy URL');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Buy/Sell USDT</Text>

      {/* Chain Selector */}
      <View style={styles.chainSelector}>
        {[WalletChain.ETHEREUM, WalletChain.POLYGON].map((chain) => (
          <TouchableOpacity
            key={chain}
            style={[
              styles.chainButton,
              selectedChain === chain && styles.chainButtonActive,
            ]}
            onPress={() => setSelectedChain(chain)}
          >
            <Text
              style={[
                styles.chainButtonText,
                selectedChain === chain && styles.chainButtonTextActive,
              ]}
            >
              {chain.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount Input */}
      <Text style={styles.label}>Amount (USD)</Text>
      <TextInput
        style={styles.input}
        value={fiatAmount}
        onChangeText={setFiatAmount}
        placeholder="100"
        keyboardType="number-pad"
      />

      {/* Buy Button */}
      <TouchableOpacity
        style={[styles.button, styles.successButton]}
        onPress={handleBuy}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Buy USDT</Text>
      </TouchableOpacity>

      {/* Sell Button */}
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => Alert.alert('Info', 'Sell feature coming soon')}
      >
        <Text style={styles.buttonText}>Sell USDT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Basic Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  nativeBalance: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  address: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  successButton: {
    backgroundColor: '#27ae60',
  },
  error: {
    color: '#e74c3c',
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#666',
  },
  chainSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  chainButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  chainButtonActive: {
    backgroundColor: '#000',
  },
  chainButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  chainButtonTextActive: {
    color: '#fff',
  },
  qrPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  qrSubtext: {
    color: '#666',
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#27ae60',
  },
});
