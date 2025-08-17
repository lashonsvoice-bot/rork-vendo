import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStripe, CardField, CardFieldInput } from '@stripe/stripe-react-native';
import { trpc } from '@/lib/trpc';

interface StripePaymentFormProps {
  tier: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripePaymentForm({ 
  tier, 
  billingCycle, 
  onSuccess, 
  onError 
}: StripePaymentFormProps) {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState<boolean>(false);
  const [cardComplete, setCardComplete] = useState<boolean>(false);

  const createCheckoutMutation = trpc.subscription.stripe.createCheckout.useMutation();

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating Stripe checkout session...');
      
      // Create checkout session
      const result = await createCheckoutMutation.mutateAsync({
        tier,
        billingCycle,
      });

      console.log('Checkout session created:', result);

      if (!result.clientSecret) {
        throw new Error('No client secret received from server');
      }

      // Confirm payment with Stripe
      const { error, paymentIntent } = await confirmPayment(result.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        const errorMessage = error.message || 'Payment failed';
        onError?.(errorMessage);
        Alert.alert('Payment Failed', errorMessage);
      } else if (paymentIntent) {
        console.log('Payment successful:', paymentIntent.id);
        Alert.alert('Success', 'Subscription created successfully!');
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (cardDetails: CardFieldInput.Details) => {
    setCardComplete(cardDetails.complete);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Details</Text>
      
      <View style={styles.cardContainer}>
        <CardField
          postalCodeEnabled={true}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={styles.card}
          style={styles.cardField}
          onCardChange={handleCardChange}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Text 
          style={[
            styles.payButton, 
            (!cardComplete || loading) && styles.payButtonDisabled
          ]}
          onPress={!cardComplete || loading ? undefined : handlePayment}
        >
          {loading ? (
            <ActivityIndicator color=\"#fff\" size=\"small\" />
          ) : (
            `Subscribe to ${tier} (${billingCycle})`
          )}
        </Text>
      </View>

      {createCheckoutMutation.error && (
        <Text style={styles.errorText}>
          {createCheckoutMutation.error.message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  cardContainer: {
    marginBottom: 20,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  card: {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
  },
  buttonContainer: {
    marginTop: 20,
  },
  payButton: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  },
});