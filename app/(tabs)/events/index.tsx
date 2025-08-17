import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { Search, MapPin, Calendar, DollarSign, Filter, Building2, Store, ChevronDown, X, Table, Users, PlusCircle } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";

export default function EventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  console.log('[Events] params:', params);
  const { 
    events, 
    getEventsByState, 
    getAvailableStates, 
    getSortedEvents,
    getPublicListings,
    getEventsAwaitingContractorSelection,
    getEventsAwaitingHost,
    markProposalSent,
  } = useEvents();
  const { userRole, currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const initialFilter = (Array.isArray(params.filter) ? params.filter[0] : params.filter) ?? "all";
  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);

  useEffect(() => {
    const incoming = (Array.isArray(params.filter) ? params.filter[0] : params.filter) ?? null;
    if (incoming) {
      console.log('[Events] applying incoming filter from params:', incoming);
      setSelectedFilter(incoming);
    }
  }, [params.filter]);
  
  // Get contractor's home state for default filtering
  const contractorHomeState = userRole === 'contractor' ? (currentUser as any)?.location : null;
  
  // Get available states for the dropdown
  const availableStates = useMemo(() => {
    if (userRole === 'contractor' || userRole === null) {
      const source = getPublicListings();
      const states = [...new Set(source.map((e: any) => e.state))];
      return states.sort();
    }
    return getAvailableStates();
  }, [userRole, events, getPublicListings, getAvailableStates]);

  const filters = userRole === 'business_owner' ? [
    { id: "all", label: "All My Events" },
    { id: "drafts", label: "Drafts" },
    { id: "awaiting_host", label: "Awaiting Host" },
    { id: "awaiting_contractors", label: "Need Contractors" },
    { id: "ready_to_hire", label: "Ready to Hire" },
    { id: "active", label: "Active" },
    { id: "contractor_listings", label: "Contractor Listings" },
  ] : userRole === 'contractor' ? [
    { id: "all", label: "Available Jobs" },
    { id: "applied", label: "Applied" },
    { id: "accepted", label: "Accepted" },
    { id: "high-pay", label: "High Pay" },
    { id: "trainings-due", label: "Trainings Due" },
  ] : userRole === 'event_host' ? [
    { id: "all", label: "My Events" },
    { id: "proposals", label: "Pending Proposals" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
  ] : [
    { id: "all", label: "Explore" },
  ];

  // Get base events list based on user role and the new workflow
  const baseEvents = useMemo(() => {
    let eventList: any[] = [];
    
    if (userRole === 'business_owner') {
      // Business owners see their own events and events they can connect to, plus contractor listings (to propose)
      eventList = events.filter(event => 
        event.businessOwnerId === currentUser?.id || 
        event.createdBy === 'business_owner' ||
        event.createdBy === 'contractor'
      );
    } else if (userRole === 'contractor') {
      // Contractors see public listings (events with hosts connected)
      eventList = getPublicListings();
      
      // Apply location filtering for contractors
      if (selectedState === null && contractorHomeState) {
        eventList = eventList.filter(event => event.state === contractorHomeState);
      } else if (selectedState && selectedState !== 'all') {
        eventList = eventList.filter(event => event.state === selectedState);
      }
    } else if (userRole === 'event_host') {
      // Event hosts see their own events and events they can connect to, plus contractor listings (view-only)
      eventList = events.filter(event => 
        event.eventHostId === currentUser?.id || 
        event.createdBy === 'event_host' ||
        (event.createdBy === 'business_owner' && !event.hostConnected) ||
        event.createdBy === 'contractor'
      );
    } else {
      // Guest users should only see public listings
      eventList = getPublicListings();

      if (selectedState && selectedState !== 'all') {
        eventList = eventList.filter(event => event.state === selectedState);
      }
    }
    
    return getSortedEvents(eventList);
  }, [events, userRole, currentUser, selectedState, contractorHomeState, getPublicListings, getSortedEvents]);
  
  const filteredEvents = useMemo(() => {
    const list = baseEvents.filter((event) => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.state.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (userRole === 'business_owner') {
        switch (selectedFilter) {
          case "drafts":
            return event.createdBy === 'business_owner' && !event.hostConnected && (event.proposalSent ?? false) === false;
          case "awaiting_host":
            return event.createdBy === 'business_owner' && !event.hostConnected && (event.proposalSent ?? false) === true;
          case "awaiting_contractors":
            return event.hostConnected && !event.contractorApplications?.length;
          case "ready_to_hire":
            return event.hostConnected === true && (event.contractorApplications?.length ?? 0) > 0 && !event.selectedContractors;
          case "active":
            return (event.selectedContractors?.length ?? 0) > 0;
          case "contractor_listings":
            return event.createdBy === 'contractor';
          default:
            return event.businessOwnerId === currentUser?.id;
        }
      } else if (userRole === 'contractor') {
        switch (selectedFilter) {
          case "applied":
            return event.contractorApplications?.some(app => app.contractorId === currentUser?.id);
          case "accepted":
            return event.selectedContractors?.includes(currentUser?.id || '');
          case "high-pay":
            return event.contractorPay >= 200;
          case "trainings-due": {
            const isSelected = event.selectedContractors?.includes(currentUser?.id || '');
            return isSelected === true;
          }
          default:
            return true;
        }
      } else if (userRole === 'event_host') {
        switch (selectedFilter) {
          case "proposals":
            return event.createdBy === 'business_owner' && !event.hostConnected;
          case "active":
            return event.eventHostId === currentUser?.id && event.status === 'active';
          case "completed":
            return event.eventHostId === currentUser?.id && event.status === 'completed';
          default:
            return true;
        }
      }

      return true;
    });

    if (userRole === 'business_owner') {
      const priority = (e: any) => {
        const hasApplications = (e.contractorApplications?.length ?? 0) > 0;
        const hasHires = (e.selectedContractors?.length ?? 0) > 0;
        if (e.hostConnected && !hasHires && hasApplications) return 0; // ready to hire
        if (e.hostConnected && !hasHires && !hasApplications) return 1; // awaiting contractors
        if (!e.hostConnected && (e.proposalSent ?? false) === true) return 2; // awaiting host
        if (!e.hostConnected && (e.proposalSent ?? false) === false && e.createdBy === 'business_owner') return 3; // drafts
        if (hasHires) return 4; // active/ongoing
        return 5; // everything else
      };
      return [...list].sort((a, b) => {
        const pa = priority(a);
        const pb = priority(b);
        if (pa !== pb) return pa - pb;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        return a.title.localeCompare(b.title);
      });
    }

    return list;
  }, [baseEvents, searchQuery, selectedFilter, userRole, currentUser]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              userRole === 'business_owner' ? "Search your events..." :
              userRole === 'contractor' ? "Search available jobs..." :
              userRole === 'event_host' ? "Search events and proposals..." :
              "Search events..."
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#10B981" />
        </TouchableOpacity>
      </View>
      
      {/* Location Filter for Contractors */}
      {userRole === 'contractor' && (
        <View style={styles.locationContainer}>
          <TouchableOpacity 
            testID="state-selector-contractor"
            style={styles.locationSelector}
            onPress={() => setShowStateModal(true)}
          >
            <MapPin size={16} color="#10B981" />
            <Text style={styles.locationText}>
              {selectedState 
                ? `${selectedState} Events` 
                : contractorHomeState 
                ? `${contractorHomeState} Events (Local)` 
                : 'All States'
              }
            </Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
          {selectedState && (
            <TouchableOpacity 
              style={styles.clearLocationButton}
              onPress={() => setSelectedState(null)}
            >
              <Text style={styles.clearLocationText}>Show Local</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Location Filter for Guests */}
      {userRole === null && (
        <View style={styles.locationContainer}>
          <TouchableOpacity
            testID="state-selector-guest"
            style={styles.locationSelector}
            onPress={() => setShowStateModal(true)}
          >
            <MapPin size={16} color="#10B981" />
            <Text style={styles.locationText}>
              {selectedState && selectedState !== 'all' ? `${selectedState} Events` : 'All States'}
            </Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
          {selectedState && selectedState !== 'all' && (
            <TouchableOpacity
              style={styles.clearLocationButton}
              onPress={() => setSelectedState('all')}
            >
              <Text style={styles.clearLocationText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {filteredEvents.map((event) => {
          // Determine card styling based on workflow status
          const getEventCardStyle = () => {
            if (userRole === 'business_owner') {
              if (!event.hostConnected) {
                return [styles.eventCard, (event.proposalSent ?? false) ? styles.eventCardAwaitingHost : styles.eventCardDraft];
              } else if ((event.contractorApplications?.length ?? 0) > 0 && !event.selectedContractors) {
                return [styles.eventCard, styles.eventCardReadyToHire];
              } else if ((event.selectedContractors?.length ?? 0) > 0) {
                return [styles.eventCard, styles.eventCardActive];
              }
            } else if (userRole === 'contractor') {
              const hasApplied = event.contractorApplications?.some(app => app.contractorId === currentUser?.id);
              const isSelected = event.selectedContractors?.includes(currentUser?.id || '');
              
              if (isSelected) {
                return [styles.eventCard, styles.eventCardAccepted];
              } else if (hasApplied) {
                return [styles.eventCard, styles.eventCardApplied];
              }
            } else if (userRole === 'event_host') {
              if (event.createdBy === 'business_owner' && !event.hostConnected) {
                return [styles.eventCard, styles.eventCardProposal];
              }
              if (event.createdBy === 'contractor') {
                return [styles.eventCard];
              }
            }
            
            return [styles.eventCard];
          };
          
          // Get status text based on workflow
          const getStatusText = () => {
            if (userRole === 'business_owner') {
              if (!event.hostConnected) return (event.proposalSent ?? false) ? 'Awaiting Host (Sent)' : 'Draft';
              if ((event.contractorApplications?.length ?? 0) > 0 && !event.selectedContractors) {
                return `${event.contractorApplications?.length ?? 0} Applications`;
              }
              if ((event.selectedContractors?.length ?? 0) > 0) {
                return `${event.selectedContractors?.length ?? 0} Hired`;
              }
              return 'Active';
            } else if (userRole === 'contractor') {
              const hasApplied = event.contractorApplications?.some(app => app.contractorId === currentUser?.id);
              const isSelected = event.selectedContractors?.includes(currentUser?.id || '');
              
              if (isSelected) return 'Selected';
              if (hasApplied) return 'Applied';
              return `${event.contractorsNeeded} spots`;
            } else if (userRole === 'event_host') {
              if (event.createdBy === 'business_owner' && !event.hostConnected) {
                return 'Proposal';
              }
              if (event.createdBy === 'contractor') {
                return 'Contractor Listing';
              }
              return event.status.charAt(0).toUpperCase() + event.status.slice(1);
            }
            return event.status;
          };
          
          return (
            <TouchableOpacity
              key={event.id}
              style={getEventCardStyle()}
              onPress={() => router.push(`/(tabs)/events/${event.id}`)}
            >
              <Image source={{ uri: event.flyerUrl }} style={styles.eventImage} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventStatus}>
                    <Text style={styles.eventStatusText}>
                      {getStatusText()}
                    </Text>
                  </View>
                </View>
              
              <View style={styles.eventMeta}>
                {event.businessName && (
                  <View style={styles.eventDetail}>
                    <Building2 size={14} color="#6B7280" />
                    <Text style={styles.eventDetailText}>{event.businessName}</Text>
                  </View>
                )}
                {event.eventHostName && (
                  <View style={styles.eventDetail}>
                    <Store size={14} color="#6B7280" />
                    <Text style={styles.eventDetailText}>{event.eventHostName}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.eventDetail}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.eventDetailText}>{event.city}, {event.state}</Text>
                </View>
                <View style={styles.eventDetail}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.eventDetailText}>{formatDate(event.date)}</Text>
                </View>
              </View>
              
              {/* Table Options for Host Events */}
              {event.tableOptions && event.tableOptions.length > 0 && (
                <View style={styles.tableOptionsContainer}>
                  <View style={styles.tableOptionsHeader}>
                    <Table size={16} color="#10B981" />
                    <Text style={styles.tableOptionsTitle}>Available Tables</Text>
                    {event.totalVendorSpaces && (
                      <View style={styles.totalSpacesBadge}>
                        <Users size={12} color="#6B7280" />
                        <Text style={styles.totalSpacesText}>
                          {event.tableOptions.reduce((taken, table) => taken + (table.quantity - table.availableQuantity), 0)}/
                          {event.totalVendorSpaces} taken
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.tableOptionsList}>
                    {event.tableOptions.slice(0, 2).map((table, index) => (
                      <View key={table.id} style={styles.tableOptionItem}>
                        <Text style={styles.tableOptionSize}>{table.size}</Text>
                        <View style={styles.tableOptionDetails}>
                          <Text style={styles.tableOptionPrice}>${table.price}</Text>
                          <View style={styles.tableAvailabilityContainer}>
                            <Text style={styles.tableOptionQuantity}>{table.quantity - table.availableQuantity}/{table.quantity}</Text>
                            <Text style={styles.tableAvailabilityLabel}>taken</Text>
                          </View>
                          <Text style={styles.tableOptionContractors}>{table.contractorsPerTable} contractors</Text>
                        </View>
                      </View>
                    ))}
                    {event.tableOptions.length > 2 && (
                      <Text style={styles.moreTablesText}>+{event.tableOptions.length - 2} more options</Text>
                    )}
                  </View>
                </View>
              )}
              
              <View style={styles.eventFooter}>
                <View style={styles.payInfo}>
                  <DollarSign size={16} color="#10B981" />
                  <Text style={styles.payAmount}>${event.contractorPay}</Text>
                  <Text style={styles.payLabel}>
                    {userRole === 'business_owner' 
                      ? 'per contractor'
                      : userRole === 'contractor'
                      ? 'per contractor'
                      : 'suggested rate'
                    }
                  </Text>
                </View>
                <View style={styles.eventFooterRight}>
                  {userRole === 'event_host' && event.eventHostId === currentUser?.id && (
                    <TouchableOpacity
                      testID={`open-host-dashboard-${event.id}`}
                      style={styles.hostDashboardButton}
                      onPress={() => router.push(`/(tabs)/events/manage/${event.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel="Open Host Dashboard"
                    >
                      <Text style={styles.hostDashboardText}>Host Dashboard</Text>
                    </TouchableOpacity>
                  )}
                  {/* Workflow status badges */}
                  {userRole === 'business_owner' && !event.hostConnected && (
                    <View style={styles.workflowBadge}>
                      <Text style={styles.workflowBadgeText}>Step 1: Need Host</Text>
                    </View>
                  )}
                  {userRole === 'business_owner' && event.hostConnected && !event.selectedContractors && (
                    <View style={styles.workflowBadge}>
                      <Text style={styles.workflowBadgeText}>Step 2: Hire Contractors</Text>
                    </View>
                  )}
                  {userRole === 'business_owner' && (event.selectedContractors?.length ?? 0) > 0 && (
                    <View style={styles.workflowBadge}>
                      <Text style={styles.workflowBadgeText}>Step 3: Send Materials</Text>
                    </View>
                  )}

                  {userRole === 'business_owner' && !event.hostConnected && (event.proposalSent ?? false) === false && (
                    <TouchableOpacity
                      testID={`send-proposal-${event.id}`}
                      style={styles.sendProposalButton}
                      onPress={() => {
                        try {
                          markProposalSent(event.id);
                        } catch (e) {
                          console.log('Failed to mark proposal sent', e);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Send Proposal"
                    >
                      <Text style={styles.sendProposalText}>Send Proposal</Text>
                    </TouchableOpacity>
                  )}
                  
                  {event.hostSupervisionFee > 0 && userRole === 'event_host' && (
                    <View style={styles.supervisionBadge}>
                      <Text style={styles.supervisionText}>+${event.hostSupervisionFee} supervision</Text>
                    </View>
                  )}
                  {event.hostSupervisionFee > 0 && userRole === 'business_owner' && (
                    <View style={styles.supervisionBadge}>
                      <Text style={styles.supervisionText}>Host ${event.hostSupervisionFee}</Text>
                    </View>
                  )}
                  {event.foodStipend && (
                    <View style={styles.stipendBadge}>
                      <Text style={styles.stipendText}>+Food</Text>
                    </View>
                  )}
                  {event.travelStipend && (
                    <View style={styles.stipendBadge}>
                      <Text style={styles.stipendText}>+Travel</Text>
                    </View>
                  )}
                  {event.stipendReleaseMethod && (
                    <View style={styles.stipendModeBadge}>
                      <DollarSign size={12} color="#065F46" />
                      <Text style={styles.stipendModeText}>
                        {event.stipendReleaseMethod === 'escrow' ? 'Escrow' : event.stipendReleaseMethod === 'prepaid_cards' ? 'Prepaid' : 'Notify Owner'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* State Selection Modal for Contractors */}
      {/* Floating CTA for Business Owners */}
      {userRole === 'business_owner' && (
        <TouchableOpacity
          testID="list-opportunity-cta"
          style={styles.fab}
          onPress={() => router.push('/(tabs)/create')}
          accessibilityRole="button"
          accessibilityLabel="List Opportunity"
        >
          <PlusCircle size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>List Opportunity</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStateModal(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.stateList}>
              {contractorHomeState && (
                <TouchableOpacity
                  style={[styles.stateItem, !selectedState && styles.stateItemActive]}
                  onPress={() => {
                    setSelectedState(null);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[styles.stateItemText, !selectedState && styles.stateItemTextActive]}>
                    {contractorHomeState} (Your State)
                  </Text>
                </TouchableOpacity>
              )}
              
              {availableStates.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[styles.stateItem, selectedState === state && styles.stateItemActive]}
                  onPress={() => {
                    setSelectedState(state);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[styles.stateItemText, selectedState === state && styles.stateItemTextActive]}>
                    {state}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.stateItem, selectedState === 'all' && styles.stateItemActive]}
                onPress={() => {
                  setSelectedState('all');
                  setShowStateModal(false);
                }}
              >
                <Text style={[styles.stateItemText, selectedState === 'all' && styles.stateItemTextActive]}>
                  All States
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 15,
    color: "#111827",
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  clearLocationButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearLocationText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  eventsList: {
    flex: 1,
    paddingTop: 16,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  eventCardAwaitingHost: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.1,
  },
  eventCardReadyToHire: {
    borderWidth: 2,
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.1,
  },
  eventCardDraft: {
    borderWidth: 2,
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
    shadowColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  eventCardActive: {
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
    shadowColor: "#10B981",
    shadowOpacity: 0.1,
  },
  eventCardApplied: {
    borderWidth: 2,
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.1,
  },
  eventCardAccepted: {
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
    shadowColor: "#10B981",
    shadowOpacity: 0.1,
  },
  eventCardProposal: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.1,
  },
  eventImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#F3F4F6",
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginRight: 8,
  },
  eventStatus: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventStatusHighlighted: {
    backgroundColor: "#F59E0B",
  },
  eventStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  eventStatusTextHighlighted: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  eventDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  eventMeta: {
    marginBottom: 8,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  payInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  eventFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  postedByTag: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  postedByText: {
    fontSize: 11,
    fontWeight: "600",
  },
  payAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
  },
  payLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  stipendBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stipendText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  supervisionBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  supervisionText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  stipendModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stipendModeText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  stateList: {
    maxHeight: 400,
  },
  stateItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  stateItemActive: {
    backgroundColor: "#F0FDF4",
  },
  stateItemText: {
    fontSize: 16,
    color: "#374151",
  },
  stateItemTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  tableOptionsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tableOptionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tableOptionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  totalSpacesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  totalSpacesText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  tableOptionsList: {
    gap: 6,
  },
  tableOptionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
  },
  tableOptionSize: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  tableOptionDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableOptionPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  tableOptionQuantity: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  tableAvailabilityContainer: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tableAvailabilityLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  tableOptionContractors: {
    fontSize: 12,
    color: "#6B7280",
  },
  moreTablesText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 4,
  },
  workflowBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  hostDashboardButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hostDashboardText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  workflowBadgeText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600",
  },
  sendProposalButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendProposalText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#10B981",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});