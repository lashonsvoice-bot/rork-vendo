import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { 
  AlertTriangle, 
  Calendar,
  Clock,
  MapPin,
  Search,
  X,
  ChevronRight,
  Building2,
  User,
  Store,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useEvents } from '@/hooks/events-store';
import { useAuth } from '@/hooks/auth-store';

export default function EventSelectionCancelScreen() {
  const { events } = useEvents();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const userEvents = useMemo(() => {
    if (!user) return [];
    
    return events.filter(event => {
      // Filter events based on user role
      if (user.role === 'business_owner') {
        return event.createdBy === 'business_owner' && 
               (event.businessOwnerId === user.id || event.selectedByBusinessId === user.id);
      } else if (user.role === 'event_host') {
        return event.createdBy === 'event_host' && event.eventHostId === user.id;
      } else if (user.role === 'contractor') {
        return event.vendors?.some(vendor => vendor.contractorId === user.id);
      }
      return false;
    }).filter(event => {
      // Only show events that can be cancelled (not completed or already cancelled)
      return event.status !== 'completed' && event.status !== 'cancelled';
    }).filter(event => {
      // Filter by search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return event.title.toLowerCase().includes(query) ||
             event.location.toLowerCase().includes(query) ||
             event.city.toLowerCase().includes(query) ||
             event.state.toLowerCase().includes(query);
    });
  }, [events, user, searchQuery]);

  const handleEventSelect = (event: any) => {
    Alert.alert(
      'Confirm Event Selection',
      `Are you sure you want to cancel "${event.title}"? This action will take you to the cancellation form.`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Continue', 
          style: 'destructive',
          onPress: () => {
            router.push({
              pathname: '/event-cancellation',
              params: {
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
              }
            });
          }
        },
      ]
    );
  };

  const getEventIcon = (event: any) => {
    if (event.createdBy === 'business_owner') {
      return <Building2 size={20} color={theme.colors.primary} />;
    } else if (event.createdBy === 'event_host') {
      return <Store size={20} color={theme.colors.warning} />;
    } else {
      return <User size={20} color={theme.colors.success} />;
    }
  };

  const getEventTypeLabel = (event: any) => {
    if (event.createdBy === 'business_owner') {
      return 'Business Event';
    } else if (event.createdBy === 'event_host') {
      return 'Host Event';
    } else {
      return 'Contractor Event';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'filled': return theme.colors.primary;
      case 'awaiting_host': return theme.colors.warning;
      case 'host_connected': return theme.colors.info;
      case 'contractors_hired': return theme.colors.secondary;
      case 'materials_sent': return theme.colors.purple;
      case 'ready_for_event': return theme.colors.success;
      default: return theme.colors.text.secondary;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isEventCancellable = (event: any) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    const hoursUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    // Events can be cancelled if they haven't started yet
    return hoursUntilEvent > -24; // Allow cancellation up to 24 hours after event start
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Select Event to Cancel',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <View style={styles.header}>
        <View style={styles.warningCard}>
          <AlertTriangle size={24} color={theme.colors.error} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Event Cancellation</Text>
            <Text style={styles.warningMessage}>
              Select an event below to cancel. Please note that cancellations may result in penalties depending on timing.
            </Text>
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.text.secondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {userEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={theme.colors.text.secondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No events found' : 'No cancellable events'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You don\'t have any events that can be cancelled at this time'
              }
            </Text>
          </View>
        ) : (
          userEvents.map((event) => {
            const eventDate = new Date(event.date);
            const now = new Date();
            const hoursUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));
            const isLessThan24Hours = hoursUntilEvent < 24 && hoursUntilEvent > 0;
            const isPastEvent = hoursUntilEvent < 0;
            const cancellable = isEventCancellable(event);
            
            return (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  !cancellable && styles.eventCardDisabled,
                  isLessThan24Hours && styles.eventCardUrgent,
                ]}
                onPress={() => cancellable && handleEventSelect(event)}
                disabled={!cancellable}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventTypeContainer}>
                    {getEventIcon(event)}
                    <Text style={styles.eventType}>{getEventTypeLabel(event)}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(event.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(event.status) }
                    ]}>
                      {formatStatus(event.status)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.eventTitle}>{event.title}</Text>
                
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailItem}>
                    <Calendar size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.eventDetailText}>
                      {eventDate.toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={styles.eventDetailItem}>
                    <Clock size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.eventDetailText}>{event.time}</Text>
                  </View>
                  
                  <View style={styles.eventDetailItem}>
                    <MapPin size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.eventDetailText} numberOfLines={1}>
                      {event.city}, {event.state}
                    </Text>
                  </View>
                </View>
                
                {isLessThan24Hours && cancellable && (
                  <View style={styles.urgentWarning}>
                    <AlertTriangle size={16} color={theme.colors.error} />
                    <Text style={styles.urgentWarningText}>
                      Less than 24 hours - Penalties will apply
                    </Text>
                  </View>
                )}
                
                {isPastEvent && (
                  <View style={styles.pastEventWarning}>
                    <Clock size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.pastEventWarningText}>
                      Event has passed - Limited cancellation window
                    </Text>
                  </View>
                )}
                
                {!cancellable && (
                  <View style={styles.nonCancellableWarning}>
                    <X size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.nonCancellableWarningText}>
                      Cannot be cancelled
                    </Text>
                  </View>
                )}
                
                {cancellable && (
                  <View style={styles.eventAction}>
                    <ChevronRight size={20} color={theme.colors.error} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'flex-start',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.background,
  },
  eventCardUrgent: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 24,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 12,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  urgentWarningText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '500',
  },
  pastEventWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  pastEventWarningText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  nonCancellableWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  nonCancellableWarningText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  eventAction: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  bottomSpacing: {
    height: 32,
  },
});