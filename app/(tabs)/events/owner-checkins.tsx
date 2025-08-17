import React, { useMemo, useCallback } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { CheckCircle, Clock, Camera, User, Calendar, MapPin, Eye, Plus, Check } from "lucide-react-native";

export default function OwnerCheckInsScreen() {
  const router = useRouter();
  const { events, updateVendorCheckIn } = useEvents();
  const { userRole, currentUser } = useUser();

  const myEvents = useMemo(() => {
    if (userRole !== 'business_owner' || !currentUser) return [] as import("@/hooks/events-store").Event[];
    return events
      .filter(e => (e.businessOwnerId === currentUser.id || e.createdBy === 'business_owner'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, userRole, currentUser]);

  const getVendorStatus = (v: import("@/hooks/events-store").VendorCheckIn) => {
    if (v.endConfirmed && v.review) return { label: 'Reviewed', color: '#10B981', bg: '#D1FAE5' } as const;
    if (v.endConfirmed) return { label: 'Completed', color: '#10B981', bg: '#D1FAE5' } as const;
    if (v.halfwayConfirmed) return { label: 'Midway', color: '#3B82F6', bg: '#DBEAFE' } as const;
    if (v.arrivalConfirmed) return { label: 'Checked In', color: '#8B5CF6', bg: '#EDE9FE' } as const;
    return { label: 'Pending', color: '#6B7280', bg: '#F3F4F6' } as const;
  };

  const toggleArrival = useCallback((eventId: string, vendorId: string, current: boolean) => {
    const now = new Date().toLocaleTimeString();
    updateVendorCheckIn(eventId, vendorId, {
      arrivalConfirmed: !current,
      arrivalTime: !current ? now : undefined,
    });
  }, [updateVendorCheckIn]);

  const toggleHalfway = useCallback((eventId: string, vendorId: string, current: boolean) => {
    const now = new Date().toLocaleTimeString();
    updateVendorCheckIn(eventId, vendorId, {
      halfwayConfirmed: !current,
      halfwayCheckIn: !current ? now : undefined,
    });
  }, [updateVendorCheckIn]);

  const toggleCompleted = useCallback((eventId: string, vendorId: string, current: boolean) => {
    const now = new Date().toLocaleTimeString();
    updateVendorCheckIn(eventId, vendorId, {
      endConfirmed: !current,
      endCheckIn: !current ? now : undefined,
    });
  }, [updateVendorCheckIn]);

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
          const total = vendors.length;
          const checkIns = vendors.filter(v => v.arrivalConfirmed).length;
          const midway = vendors.filter(v => v.halfwayConfirmed).length;
          const completed = vendors.filter(v => v.endConfirmed).length;
          const pending = Math.max(total - checkIns, 0);

          const groups = vendors.reduce<Record<string, import("@/hooks/events-store").VendorCheckIn[]>>((acc, v) => {
            const key = v.tableLabel?.trim() || 'Unassigned';
            if (!acc[key]) acc[key] = [] as import("@/hooks/events-store").VendorCheckIn[];
            acc[key].push(v);
            return acc;
          }, {});

          const onPlusOne = (groupKey?: string) => {
            const list = groupKey ? (groups[groupKey] ?? []) : vendors;
            const next = list.find(v => !v.arrivalConfirmed);
            if (next) {
              toggleArrival(event.id, next.id, false);
            }
          };

          return (
            <View key={event.id} style={styles.eventCard} testID={`owner-event-${event.id}`}>
              <TouchableOpacity
                style={styles.eventHeader}
                onPress={() => router.push({ pathname: '/(tabs)/events/[id]', params: { id: String(event.id) } })}
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
                <View style={styles.kpiCard} testID={`kpi-vendors-${event.id}`}>
                  <User size={14} color="#10B981" />
                  <Text style={styles.kpiNumber}>{total}</Text>
                  <Text style={styles.kpiLabel}>Vendors</Text>
                </View>
                <View style={styles.kpiCard} testID={`kpi-checkins-${event.id}`}>
                  <CheckCircle size={14} color="#6366F1" />
                  <Text style={styles.kpiNumber}>{`${checkIns}/${total}`}</Text>
                  <Text style={styles.kpiLabel}>Check-in</Text>
                </View>
                <View style={styles.kpiCard} testID={`kpi-midway-${event.id}`}>
                  <Clock size={14} color="#3B82F6" />
                  <Text style={styles.kpiNumber}>{`${midway}/${total}`}</Text>
                  <Text style={styles.kpiLabel}>Midway</Text>
                </View>
                <View style={styles.kpiCard} testID={`kpi-completed-${event.id}`}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.kpiNumber}>{`${completed}/${total}`}</Text>
                  <Text style={styles.kpiLabel}>Completed</Text>
                </View>
                <TouchableOpacity
                  style={styles.plusOneButton}
                  onPress={() => onPlusOne(undefined)}
                  accessibilityRole="button"
                  accessibilityLabel="Quick add one check-in"
                  testID={`plus-one-${event.id}`}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.plusOneText}>+1 Check-in</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.progressBar} accessibilityLabel={`progress-${event.id}`} testID={`progress-${event.id}`}>
                <View style={[styles.progressSegment, { flex: completed, backgroundColor: '#10B981' }]} />
                <View style={[styles.progressSegment, { flex: Math.max(midway - completed, 0), backgroundColor: '#3B82F6' }]} />
                <View style={[styles.progressSegment, { flex: Math.max(checkIns - midway, 0), backgroundColor: '#6366F1' }]} />
                <View style={[styles.progressSegment, { flex: pending, backgroundColor: '#E5E7EB' }]} />
              </View>

              {vendors.length > 0 && (
                <View style={styles.vendorList}>
                  {Object.keys(groups).sort().map((groupKey) => {
                    const list = groups[groupKey] ?? [];
                    const gTotal = list.length;
                    const gCheckIns = list.filter(v => v.arrivalConfirmed).length;
                    const gMidway = list.filter(v => v.halfwayConfirmed).length;
                    const gCompleted = list.filter(v => v.endConfirmed).length;
                    const hasNext = list.some(v => !v.arrivalConfirmed);
                    return (
                      <View key={`${event.id}-${groupKey}`} style={styles.groupBlock}>
                        <View style={styles.groupHeader}>
                          <Text style={styles.groupTitle}>{groupKey}</Text>
                          <View style={styles.groupKpis}>
                            <View style={styles.groupKpi}>
                              <Text style={styles.groupKpiNumber}>{gCheckIns}/{gTotal}</Text>
                              <Text style={styles.groupKpiLabel}>Check-in</Text>
                            </View>
                            <View style={styles.groupKpi}>
                              <Text style={styles.groupKpiNumber}>{gMidway}/{gTotal}</Text>
                              <Text style={styles.groupKpiLabel}>Midway</Text>
                            </View>
                            <View style={styles.groupKpi}>
                              <Text style={styles.groupKpiNumber}>{gCompleted}/{gTotal}</Text>
                              <Text style={styles.groupKpiLabel}>Completed</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[styles.plusOneSmall, !hasNext ? styles.plusOneDisabled : undefined]}
                            disabled={!hasNext}
                            onPress={() => onPlusOne(groupKey)}
                            testID={`plus-one-${event.id}-${groupKey}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Quick +1 check-in for ${groupKey}`}
                          >
                            <Plus size={14} color="#FFFFFF" />
                            <Text style={styles.plusOneSmallText}>+1</Text>
                          </TouchableOpacity>
                        </View>

                        {list.map(v => {
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
                                <View style={styles.actionRow}>
                                  <TouchableOpacity
                                    style={[styles.actionBtn, v.arrivalConfirmed ? styles.actionOnCheckIn : styles.actionOff]}
                                    onPress={() => toggleArrival(event.id, v.id, v.arrivalConfirmed)}
                                    testID={`toggle-arrival-${v.id}`}
                                  >
                                    <Check size={12} color={v.arrivalConfirmed ? '#FFFFFF' : '#6366F1'} />
                                    <Text style={[styles.actionText, v.arrivalConfirmed ? styles.actionTextOn : styles.actionTextOff]}>Check-in</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.actionBtn, v.halfwayConfirmed ? styles.actionOnMidway : styles.actionOff]}
                                    onPress={() => toggleHalfway(event.id, v.id, v.halfwayConfirmed)}
                                    testID={`toggle-midway-${v.id}`}
                                  >
                                    <Clock size={12} color={v.halfwayConfirmed ? '#FFFFFF' : '#3B82F6'} />
                                    <Text style={[styles.actionText, v.halfwayConfirmed ? styles.actionTextOn : styles.actionTextOff]}>Midway</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.actionBtn, v.endConfirmed ? styles.actionOnCompleted : styles.actionOff]}
                                    onPress={() => toggleCompleted(event.id, v.id, v.endConfirmed)}
                                    testID={`toggle-completed-${v.id}`}
                                  >
                                    <CheckCircle size={12} color={v.endConfirmed ? '#FFFFFF' : '#10B981'} />
                                    <Text style={[styles.actionText, v.endConfirmed ? styles.actionTextOn : styles.actionTextOff]}>Completed</Text>
                                  </TouchableOpacity>
                                </View>

                                {v.arrivalTime && (
                                  <Text style={styles.timeText}>Arrived: {v.arrivalTime}</Text>
                                )}
                                {v.halfwayCheckIn && (
                                  <Text style={styles.timeText}>Midway: {v.halfwayCheckIn}</Text>
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
    alignItems: 'center',
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
  plusOneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  plusOneText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  vendorList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  groupBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 8,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  groupKpis: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  groupKpi: {
    alignItems: 'center',
  },
  groupKpiNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  groupKpiLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  plusOneSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  plusOneDisabled: {
    backgroundColor: '#A5B4FC',
  },
  plusOneSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  progressSegment: {
    height: 8,
  },
  vendorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
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
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actionOff: {
    backgroundColor: '#FFFFFF',
  },
  actionOnCheckIn: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  actionOnMidway: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionOnCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionTextOn: {
    color: '#FFFFFF',
  },
  actionTextOff: {
    color: '#374151',
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