import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Settings,
  DollarSign,
  Package,
  AlertCircle,
  Edit3,
  Table,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { useCommunication } from "@/hooks/communication-store";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { events, updateEvent, addEvent } = useEvents();
  const { userRole, currentUser, businessOwners } = useUser();
  const { sendCoordinationMessage } = useCommunication();
  const event = events.find((e) => e.id === id);
  const isBusinessOwnerOwn = userRole === 'business_owner' && event?.createdBy === 'business_owner';
  const isEventHostOwn = userRole === 'event_host' && event?.createdBy === 'event_host';
  const isDraftForBO = isBusinessOwnerOwn && (event?.hostConnected ?? false) === false;
  const isContractorListing = event?.createdBy === 'contractor';

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>Event not found</Text>
      </View>
    );
  }

  const details = [
    { icon: MapPin, label: "Location", value: event.location },
    { icon: Calendar, label: "Date", value: event.date },
    { icon: Clock, label: "Time", value: event.time },
  ];

  type CompensationItem = { label: string; amount: number; type: 'contractor' | 'stipend' | 'host' };
  const compensation: CompensationItem[] = (() => {
    const items: CompensationItem[] = [
      { label: "Contractor Pay", amount: event.contractorPay, type: "contractor" },
    ];
    if (event.foodStipend) {
      items.push({ label: "Food Stipend", amount: event.foodStipend, type: "stipend" });
    }
    if (event.travelStipend) {
      items.push({ label: "Travel Stipend", amount: event.travelStipend, type: "stipend" });
    }

    return items;
  })();

  const canOfferToHost = userRole === 'event_host' && event.createdBy === 'business_owner' && (event.contractorsNeeded ?? 0) > 0;
  const existingHostInterest = event.hostInterest;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: event.flyerUrl }} style={styles.headerImage} />
      
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.statusBadge}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={styles.statusText}>
              {(event.proposalSent ?? false)
                ? (event.hostConnected ? 'Host Connected' : 'Awaiting Host')
                : (event.hostConnected ? 'Host Connected' : 'Draft')}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{event.description}</Text>

        {event.tableOptions && event.tableOptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Tables</Text>
            <View style={styles.tableOptionsCard}>
              <View style={styles.tableOptionsHeader}>
                <View style={styles.tableOptionsInfo}>
                  <Table size={20} color="#10B981" />
                  <Text style={styles.tableOptionsTitle}>Vendor Spaces</Text>
                </View>
                {event.totalVendorSpaces && (
                  <View style={styles.totalSpacesBadge}>
                    <Users size={14} color="#6B7280" />
                    <Text style={styles.totalSpacesText}>
                      {event.tableOptions.reduce((taken, table) => taken + (table.quantity - table.availableQuantity), 0)}/{event.totalVendorSpaces} taken
                    </Text>
                  </View>
                )}
              </View>
              {event.tableOptions.map((table) => (
                <View key={table.id} style={styles.tableOptionItem}>
                  <View style={styles.tableOptionHeader}>
                    <Text style={styles.tableOptionSize}>{table.size}</Text>
                    <Text style={styles.tableOptionPrice}>${table.price}</Text>
                  </View>
                  <View style={styles.tableOptionDetails}>
                    <View style={styles.tableOptionStat}>
                      <Text style={styles.tableOptionStatLabel}>Available</Text>
                      <Text style={styles.tableOptionStatValue}>{table.availableQuantity}/{table.quantity}</Text>
                    </View>
                    <View style={styles.tableOptionStat}>
                      <Text style={styles.tableOptionStatLabel}>Contractors per Table</Text>
                      <Text style={styles.tableOptionStatValue}>{table.contractorsPerTable}</Text>
                    </View>
                    <View style={styles.tableOptionStat}>
                      <Text style={styles.tableOptionStatLabel}>Total Spaces</Text>
                      <Text style={styles.tableOptionStatValue}>{table.quantity * table.contractorsPerTable}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          {details.map((detail, index) => {
            const Icon = detail.icon;
            return (
              <View key={`${detail.label}-${index}`} style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Icon size={18} color="#6B7280" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{detail.value}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          <View style={styles.compensationCard} testID="compensation-card">
            {event.stipendReleaseMethod && (
              <View style={styles.stipendModeHeader}>
                <View style={styles.stipendModeBadge}>
                  <DollarSign size={14} color="#065F46" />
                  <Text style={styles.stipendModeText}>
                    {event.stipendReleaseMethod === 'escrow' ? 'Stipend via Escrow' : event.stipendReleaseMethod === 'prepaid_cards' ? 'Prepaid Cards' : 'Notify Owner to Release'}
                  </Text>
                </View>
              </View>
            )}
            {compensation.map((item, index) => (
              <View
                key={`${item.label}-${index}`}
                style={[
                  styles.compensationRow,
                  index < compensation.length - 1 && styles.compensationRowBorder,
                ]}
              >
                <Text style={styles.compensationLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.compensationAmount,
                    item.type === "stipend" && styles.stipendAmount,
                  ]}
                >
                  ${item.amount}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total per Contractor</Text>
              <Text style={styles.totalAmount}>
                ${event.contractorPay + (event.foodStipend || 0) + (event.travelStipend || 0)}
              </Text>
            </View>
            {userRole === 'contractor' && (
              <View style={styles.taxNote}>
                <AlertCircle size={14} color="#92400E" />
                <Text style={styles.taxNoteText}>RevoVend does not withhold taxes. You are responsible for applicable taxes.</Text>
              </View>
            )}
          </View>
        </View>

        {userRole === 'business_owner' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Host Confirmations</Text>
            <View style={styles.confirmationCard}>
              <View style={[styles.confirmationItem, event.paymentReceived ? styles.confirmationItem : undefined]} testID="payment-confirmation-item">
                <View style={styles.confirmationIcon}>
                  <DollarSign size={18} color={event.paymentReceived ? "#10B981" : "#6B7280"} />
                </View>
                <View style={styles.confirmationContent}>
                  <Text style={styles.confirmationLabel}>Payment Received</Text>
                  <Text style={styles.confirmationSubtext}>
                    {event.paymentReceived 
                      ? `Confirmed on ${event.paymentReceivedDate ? new Date(event.paymentReceivedDate).toLocaleDateString() : 'Unknown date'}`
                      : 'Waiting for host to confirm payment receipt in their template'}
                  </Text>
                </View>
                <View style={[styles.confirmationStatus, event.paymentReceived && styles.confirmationStatusActive]}>
                  {event.paymentReceived ? (
                    <CheckCircle size={20} color="#10B981" />
                  ) : (
                    <AlertCircle size={20} color="#F59E0B" />
                  )}
                </View>
              </View>

              <View style={[styles.confirmationItem, event.materialsReceived ? styles.confirmationItem : undefined]} testID="materials-confirmation-item">
                <View style={styles.confirmationIcon}>
                  <Package size={18} color={event.materialsReceived ? "#10B981" : "#6B7280"} />
                </View>
                <View style={styles.confirmationContent}>
                  <Text style={styles.confirmationLabel}>Materials/Deliverables</Text>
                  <Text style={styles.confirmationSubtext}>
                    {event.materialsReceived 
                      ? `Received on ${event.materialsReceivedDate ? new Date(event.materialsReceivedDate).toLocaleDateString() : 'Unknown date'}`
                      : 'Waiting for host to confirm packages received in their template'}
                  </Text>
                </View>
                <View style={[styles.confirmationStatus, event.materialsReceived && styles.confirmationStatusActive]}>
                  {event.materialsReceived ? (
                    <CheckCircle size={20} color="#10B981" />
                  ) : (
                    <AlertCircle size={20} color="#F59E0B" />
                  )}
                </View>
              </View>
            </View>
            {(event.paymentReceived || event.materialsReceived) && (
              <View style={styles.infoCard} testID="host-confirmations-info">
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.infoText}>These confirmations are informational. They highlight for the business owner when the host has marked items as received.</Text>
              </View>
            )}
          </View>
        )}

        {canOfferToHost && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Host Opportunity</Text>
            <View style={styles.infoCard} testID="host-opportunity-card">
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>Hosts can select this opportunity and receive a host payout after the event.</Text>
            </View>
          </View>
        )}

        {userRole === 'business_owner' && isContractorListing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turn This Into A Proposal</Text>
            <View style={styles.infoCard}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.infoText}>Create a proposal from this contractor listing so event hosts can review it and connect.</Text>
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              testID="send-proposal-from-listing"
              onPress={() => {
                try {
                  const owner = currentUser as unknown as import("@/hooks/user-store").BusinessOwner | null;
                  if (!owner) {
                    Alert.alert('Not logged in', 'Please log in as a business owner to send proposals.');
                    return;
                  }
                  const created = addEvent({
                    title: event.title,
                    description: event.description,
                    businessName: owner.businessName,
                    website: event.website,
                    location: event.location,
                    date: event.date,
                    time: event.time,
                    contractorsNeeded: Math.max(1, event.contractorsNeeded || 1),
                    contractorPay: event.contractorPay || 0,
                    hostSupervisionFee: event.hostSupervisionFee || 0,
                    flyerUrl: event.flyerUrl,
                    businessOwnerId: owner.id,
                    createdBy: 'business_owner',
                    proposalSent: true,
                    originalEventId: event.id,
                  });
                  Alert.alert('Success', 'Proposal created and sent to hosts. You can track it under Awaiting Host.');
                } catch (e) {
                  Alert.alert('Error', 'Failed to create proposal. Please try again.');
                }
              }}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Send Proposal to Hosts</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {existingHostInterest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Interest</Text>
            <View style={styles.businessCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <DollarSign size={18} color="#6B7280" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Proposed Host Payout</Text>
                  <Text style={styles.detailValue}>${existingHostInterest.proposedPayout}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar size={18} color="#6B7280" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Expressed On</Text>
                  <Text style={styles.detailValue}>{new Date(existingHostInterest.date).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {(isBusinessOwnerOwn || isEventHostOwn) ? (
          <View style={styles.hostButtonsContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              testID="edit-event-button"
              onPress={() => {
                router.push(`/events/edit/${event.id}`);
              }}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Edit3 size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Edit Event</Text>
              </LinearGradient>
            </TouchableOpacity>

            {isEventHostOwn && (
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => router.push(`/events/manage/${event.id}`)}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Settings size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Manage Vendors</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {isDraftForBO && (event.proposalSent ?? false) === false && (
              <TouchableOpacity 
                style={styles.manageButton}
                testID="send-proposal-draft-details"
                onPress={() => {
                  try {
                    updateEvent(event.id, { proposalSent: true });
                  } catch (e) {
                    // no-op
                  }
                }}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Send Proposal</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {userRole === 'contractor' && (
              <TouchableOpacity 
                style={styles.applyButton} 
                testID="apply-contractor-button"
                onPress={() => {
                  try {
                    const contractor = currentUser as unknown as import("@/hooks/user-store").Contractor | null;
                    if (!contractor) return;
                    const ownerId = event.businessOwnerId ?? event.selectedByBusinessId;
                    if (!ownerId) {
                      // Owner not set yet
                    }
                    updateEvent(event.id, { contractorsNeeded: Math.max(0, (event.contractorsNeeded ?? 0) - 1) });
                    if (ownerId) {
                      const owner = businessOwners.find(b => b.id === ownerId);
                      const toUserName = owner?.name ?? 'Business Owner';
                      sendCoordinationMessage(
                        contractor.id,
                        contractor.name,
                        'contractor',
                        ownerId,
                        toUserName,
                        'business_owner',
                        event.id,
                        event.title,
                        'Contractor Interest',
                        `${contractor.name} expressed interest in your opportunity "${event.title}".`
                      );
                    }
                  } catch (e) {
                    // no-op
                  }
                }}
              >
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>I’m Interested</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {canOfferToHost && !existingHostInterest && (
              <TouchableOpacity
                style={styles.manageButton}
                testID="offer-to-host-button"
                onPress={() => {
                  try {
                    const hostUser = currentUser as unknown as import("@/hooks/user-store").EventHost | null;
                    if (!hostUser) {
                      return;
                    }
                    const proposed = event.hostSupervisionFee ?? 0;
                    updateEvent(event.id, {
                      hostInterest: {
                        hostId: hostUser.id,
                        hostName: hostUser.name,
                        proposedPayout: proposed,
                        date: new Date().toISOString(),
                      },
                    });
                  } catch (e) {
                    // no-op
                  }
                }}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>I’m Interested to Host</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#F3F4F6",
  },
  content: {
    padding: 20,
    marginTop: -30,
  },
  titleSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  description: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  compensationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stipendModeHeader: {
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  stipendModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  stipendModeText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "700",
  },
  compensationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  compensationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  compensationLabel: {
    fontSize: 15,
    color: "#4B5563",
  },
  compensationAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  stipendAmount: {
    color: "#F59E0B",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
  },
  taxNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  taxNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
  },
  businessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableOptionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  tableOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tableOptionsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableOptionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalSpacesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalSpacesText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  tableOptionItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tableOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tableOptionSize: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  tableOptionPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  tableOptionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  tableOptionStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
  },
  tableOptionStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
    textAlign: "center",
  },
  tableOptionStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  confirmationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  confirmationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  confirmationIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationContent: {
    flex: 1,
  },
  confirmationLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  confirmationSubtext: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  confirmationStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationStatusActive: {
    backgroundColor: "#D1FAE5",
  },
  hostButtonsContainer: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
  },
  applyButton: {
    marginTop: 8,
  },
  manageButton: {
    marginTop: 8,
  },
  buttonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  bottomSpacing: {
    height: 20,
  },
});