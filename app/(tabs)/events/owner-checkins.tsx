import React, { useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { CheckCircle, Clock, Camera, User, Calendar, MapPin, Eye } from "lucide-react-native";

export default function OwnerCheckInsScreen() {
  const router = useRouter();
  const { events } = useEvents();
  const { userRole, currentUser } = useUser();

  const myEvents = useMemo(() => {
    if (userRole !== 'business_owner' || !currentUser) return [] as import("@/hooks/events-store").Event[];
    return events
      .filter(e => (e.businessOwnerId === currentUser.id || e.createdBy === 'business_owner'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, userRole, currentUser]);

  const getVendorStatus = (v: import("@/hooks/events-store").VendorCheckIn) => {
    if (v.fundsReleased && v.review) return { label: 'Reviewed', color: '#10B981', bg: '#D1FAE5' } as const;
    if (v.fundsReleased) return { label: 'Completed', color: '#10B981', bg: '#D1FAE5' } as const;
    if (v.endConfirmed) return { label: 'Event Ended', color: '#F59E0B', bg: '#FEF3C7' } as const;
    if (v.halfwayConfirmed) return { label: 'In Progress', color: '#3B82F6', bg: '#DBEAFE' } as const;
    if (v.arrivalConfirmed) return { label: 'Checked In', color: '#8B5CF6', bg: '#EDE9FE' } as const;
    return { label: 'Pending', color: '#6B7280', bg: '#F3F4F6' } as const;
  };

  if (userRole !== 'business_owner') {
    return (
      <View style={styles.center}>
        <Text style={styles.notAllowed} testID="owner-checkins-not-allowed">Only business owners can view this page.</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.notAllowed} testID="owner-checkins-login">Please log in to view your event check-ins.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Check-ins Overview</Text>
        <Text style={styles.headerSub}>Monitor host progress across your events</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} testID="owner-checkins-list">
        {myEvents.map(event => {
          const vendors = event.vendors ?? [];
          const completed = vendors.filter(v => v.fundsReleased).length;
          const inProgress = vendors.filter(v => !v.fundsReleased && (v.halfwayConfirmed || v.endConfirmed)).length;
          const pending = vendors.filter(v => !v.arrivalConfirmed).length;

          return (
            <View key={event.id} style={styles.eventCard} testID={`owner-event-${event.id}`}>
              <TouchableOpacity
                style={styles.eventHeader}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.title}`}
                testID={`open-event-${event.id}`}
              >
                <Image source={{ uri: event.flyerUrl }} style={styles.flyer} />
                <View style={styles.eventHeaderRight}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{new Date(event.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{event.city ?? ''}{event.state ? `, ${event.state}` : ''}</Text>
                    </View>
                  </View>
                </View>
                <Eye size={18} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <User size={14} color="#10B981" />
                  <Text style={styles.kpiNumber}>{vendors.length}</Text>
                  <Text style={styles.kpiLabel}>Vendors</Text>
                </View>
                <View style={styles.kpiCard}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.kpiNumber}>{completed}</Text>
                  <Text style={styles.kpiLabel}>Completed</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Clock size={14} color="#3B82F6" />
                  <Text style={styles.kpiNumber}>{inProgress}</Text>
                  <Text style={styles.kpiLabel}>In Progress</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Clock size={14} color="#9CA3AF" />
                  <Text style={styles.kpiNumber}>{pending}</Text>
                  <Text style={styles.kpiLabel}>Pending</Text>
                </View>
              </View>

              {vendors.length > 0 && (
                <View style={styles.vendorList}>
                  {vendors.map(v => {
                    const s = getVendorStatus(v);
                    return (
                      <View key={v.id} style={styles.vendorRow} testID={`vendor-row-${v.id}`}>
                        <View style={styles.vendorLeft}>
                          <View style={styles.avatar}>
                            <User size={16} color="#6366F1" />
                          </View>
                          <View style={styles.vendorInfo}>
                            <Text style={styles.vendorName}>{v.vendorName}</Text>
                            <View style={[styles.statusPill, { backgroundColor: s.bg }]}> 
                              <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.vendorRight}>
                          {v.arrivalTime && (
                            <Text style={styles.timeText}>Arrived: {v.arrivalTime}</Text>
                          )}
                          {v.halfwayCheckIn && (
                            <Text style={styles.timeText}>Halfway: {v.halfwayCheckIn}</Text>
                          )}
                          {v.endCheckIn && (
                            <Text style={styles.timeText}>End: {v.endCheckIn}</Text>
                          )}
                          <View style={styles.photosBadge}>
                            <Camera size={14} color="#6366F1" />
                            <Text style={styles.photosText}>{v.eventPhotos.length}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {myEvents.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>Create an opportunity and connect with a host to start tracking check-ins.</Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  list: {
    flex: 1,
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
  eventHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  flyer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  eventHeaderRight: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 4,
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  vendorList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  vendorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  vendorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  vendorRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  photosBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photosText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notAllowed: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});