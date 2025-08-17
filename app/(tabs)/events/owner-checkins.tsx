import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useEvents } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { CheckCircle, Clock, Camera, User, Calendar, MapPin, Eye, Lock, StickyNote, Search, Scan } from "lucide-react-native";

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

  const [filter, setFilter] = useState<'all' | 'unassigned' | 'checkedin' | 'midway' | 'completed'>('all');
  const [notesVisible, setNotesVisible] = useState<boolean>(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [debounced, setDebounced] = useState<string>("");
  const searchRef = useRef<TextInput | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ eventId: string; key: string } | null>(null);
  const [scanVisible, setScanVisible] = useState<boolean>(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const FilterPill = useCallback(({ label, value }: { label: string; value: 'all' | 'unassigned' | 'checkedin' | 'midway' | 'completed' }) => {
    const active = filter === value;
    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        style={[styles.filterPill, active ? styles.filterPillActive : undefined]}
        testID={`filter-${value}`}
        accessibilityRole="button"
        accessibilityLabel={`Filter ${label}`}
      >
        <Text style={[styles.filterPillText, active ? styles.filterPillTextActive : undefined]}>{label}</Text>
      </TouchableOpacity>
    );
  }, [filter]);

  const getSelectedGroupList = useCallback(() => {
    if (!selectedGroup) return [] as import("@/hooks/events-store").VendorCheckIn[];
    const event = events.find(e => e.id === selectedGroup.eventId);
    if (!event) return [] as import("@/hooks/events-store").VendorCheckIn[];
    const all = (event.vendors ?? []);
    const list = all.filter(v => (v.tableLabel?.trim() || 'Unassigned') === selectedGroup.key);
    return list;
  }, [selectedGroup, events]);

  const footerPlusOne = useCallback(() => {
    const list = getSelectedGroupList();
    const next = list.find(v => !v.arrivalConfirmed);
    if (next) toggleArrival(selectedGroup?.eventId ?? '', next.id, false);
  }, [getSelectedGroupList, toggleArrival, selectedGroup]);

  const footerMarkMidway = useCallback(() => {
    const list = getSelectedGroupList();
    const next = list.find(v => v.arrivalConfirmed && !v.halfwayConfirmed);
    if (next) toggleHalfway(selectedGroup?.eventId ?? '', next.id, false);
  }, [getSelectedGroupList, toggleHalfway, selectedGroup]);

  const footerCompleteTable = useCallback(() => {
    const list = getSelectedGroupList();
    list.forEach(v => {
      if (!v.endConfirmed) toggleCompleted(selectedGroup?.eventId ?? '', v.id, false);
    });
  }, [getSelectedGroupList, toggleCompleted, selectedGroup]);

  const openNotes = useCallback((eventId: string, vendorId: string, currentNotes?: string) => {
    setActiveEventId(eventId);
    setActiveVendorId(vendorId);
    setNotesText(currentNotes ?? "");
    setNotesVisible(true);
  }, []);

  const closeNotes = useCallback(() => {
    setNotesVisible(false);
    setActiveEventId(null);
    setActiveVendorId(null);
    setNotesText("");
  }, []);

  const saveNotes = useCallback(() => {
    if (!activeEventId || !activeVendorId) return;
    updateVendorCheckIn(activeEventId, activeVendorId, { notes: notesText });
    closeNotes();
  }, [activeEventId, activeVendorId, notesText, updateVendorCheckIn, closeNotes]);

  const clearNotes = useCallback(() => {
    if (!activeEventId || !activeVendorId) return;
    updateVendorCheckIn(activeEventId, activeVendorId, { notes: undefined });
    closeNotes();
  }, [activeEventId, activeVendorId, updateVendorCheckIn, closeNotes]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Check-ins Overview</Text>
        <Text style={styles.headerSub}>Host-managed: Digital passes scanned by host with ID verification</Text>
        <TextInput
          ref={searchRef}
          value={search}
          onChangeText={setSearch}
          placeholder="Search vendors, tables, roles..."
          style={styles.searchBox}
          testID="global-search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          <FilterPill label="All" value="all" />
          <FilterPill label="Unassigned" value="unassigned" />
          <FilterPill label="Checked-in" value="checkedin" />
          <FilterPill label="Midway" value="midway" />
          <FilterPill label="Completed" value="completed" />
        </ScrollView>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} testID="owner-checkins-list">
        {myEvents.map(event => {
          let vendors = event.vendors ?? [];

          const matchQuery = (v: import("@/hooks/events-store").VendorCheckIn) => {
            if (!debounced) return true;
            const name = v.vendorName?.toLowerCase() ?? '';
            const table = v.tableLabel?.toLowerCase() ?? '';
            const role = '';
            return name.includes(debounced) || table.includes(debounced) || role.includes(debounced);
          };
          const total = vendors.length;
          const checkIns = vendors.filter(v => v.arrivalConfirmed).length;
          const midway = vendors.filter(v => v.halfwayConfirmed).length;
          const completed = vendors.filter(v => v.endConfirmed).length;
          const pending = Math.max(total - checkIns, 0);

          const matchesFilter = (v: import("@/hooks/events-store").VendorCheckIn) => {
            if (filter === 'all') return true;
            if (filter === 'unassigned') return !v.contractorId;
            if (filter === 'checkedin') return v.arrivalConfirmed;
            if (filter === 'midway') return v.halfwayConfirmed;
            if (filter === 'completed') return v.endConfirmed;
            return true;
          };

          vendors = vendors.filter(matchesFilter).filter(matchQuery);

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
              </View>

              <View style={styles.progressBar} accessibilityLabel={`progress-${event.id}`} testID={`progress-${event.id}`}>
                <View style={[styles.progressSegment, { flex: completed, backgroundColor: '#10B981' }]} />
                <View style={[styles.progressSegment, { flex: Math.max(midway - completed, 0), backgroundColor: '#3B82F6' }]} />
                <View style={[styles.progressSegment, { flex: Math.max(checkIns - midway, 0), backgroundColor: '#6366F1' }]} />
                <View style={[styles.progressSegment, { flex: pending, backgroundColor: '#E5E7EB' }]} />
              </View>

              {vendors.length > 0 && (
                <View style={styles.vendorList}>
                  {Object.keys(groups)
                    .sort((a, b) => (a === 'Unassigned' ? -1 : b === 'Unassigned' ? 1 : a.localeCompare(b)))
                    .map((groupKey) => {
                    const list = groups[groupKey] ?? [];
                    const gTotal = list.length;
                    const gCheckIns = list.filter(v => v.arrivalConfirmed).length;
                    const gMidway = list.filter(v => v.halfwayConfirmed).length;
                    const gCompleted = list.filter(v => v.endConfirmed).length;
                    const hasNext = list.some(v => !v.arrivalConfirmed);
                    return (
                      <View key={`${event.id}-${groupKey}`} style={styles.groupBlock}>
                        <TouchableOpacity
                          style={[styles.groupHeader, selectedGroup?.eventId === event.id && selectedGroup?.key === groupKey ? styles.groupHeaderSelected : undefined]}
                          onPress={() => setSelectedGroup(prev => (prev && prev.eventId === event.id && prev.key === groupKey ? null : { eventId: event.id, key: groupKey }))}
                          accessibilityRole="button"
                          accessibilityLabel={`Select group ${groupKey}`}
                        >
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
                        </TouchableOpacity>

                        {[...list]
                          .sort((a, b) => {
                            const aUn = a.contractorId ? 1 : 0;
                            const bUn = b.contractorId ? 1 : 0;
                            if (aUn !== bUn) return aUn - bUn;
                            const an = a.vendorName ?? '';
                            const bn = b.vendorName ?? '';
                            return an.localeCompare(bn);
                          })
                          .map(v => {
                          const s = getVendorStatus(v);
                          return (
                            <View key={v.id} style={styles.vendorRow} testID={`vendor-row-${v.id}`}>
                              <View style={styles.vendorLeft}>
                                <View style={styles.avatar}>
                                  <User size={16} color="#6366F1" />
                                </View>
                                <View style={styles.vendorInfo}>
                                  <Text style={styles.vendorName}>
                                    {(() => {
                                      const name = v.vendorName ?? '';
                                      if (!debounced) return name;
                                      const lower = name.toLowerCase();
                                      const idx = lower.indexOf(debounced);
                                      if (idx === -1) return name;
                                      const before = name.slice(0, idx);
                                      const match = name.slice(idx, idx + debounced.length);
                                      const after = name.slice(idx + debounced.length);
                                      return (
                                        <Text>
                                          <Text>{before}</Text>
                                          <Text style={styles.highlight}>{match}</Text>
                                          <Text>{after}</Text>
                                        </Text>
                                      ) as unknown as string;
                                    })()}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => openNotes(event.id, v.id, v.notes)}
                                    style={[styles.statusPill, { backgroundColor: s.bg }]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`View status for ${v.vendorName}`}
                                  >
                                    <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <View style={styles.vendorRight}>

                                {v.arrivalTime && (
                                  <Text style={styles.timeText}>Arrived: {v.arrivalTime}</Text>
                                )}
                                {v.halfwayCheckIn && (
                                  <Text style={styles.timeText}>Midway: {v.halfwayCheckIn}</Text>
                                )}
                                {v.endCheckIn && (
                                  <Text style={styles.timeText}>End: {v.endCheckIn}</Text>
                                )}
                                <View style={styles.rightBadgesRow}>
                                  {v.notes ? (
                                    <View style={styles.noteBadge} testID={`notes-badge-${v.id}`}>
                                      <Lock size={12} color="#111827" />
                                      <Text style={styles.noteBadgeLabel}>Notes</Text>
                                    </View>
                                  ) : null}
                                  <View style={styles.photosBadge}>
                                    <Camera size={14} color="#6366F1" />
                                    <Text style={styles.photosText}>{v.eventPhotos.length}</Text>
                                  </View>
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
            <Text style={styles.emptyText}>Create an opportunity and connect with a host. Contractors receive digital passes, which hosts scan along with ID verification for secure check-ins.</Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal
        visible={notesVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNotes}
      >
        <View style={styles.modalOverlay} testID="notes-modal-overlay">
          <View style={styles.modalCard} testID="notes-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <StickyNote size={18} color="#111827" />
                <Text style={styles.modalTitle}>Private Notes</Text>
              </View>
              <Text style={styles.modalSub}>Host-managed notes from scanning process. Owners view only.</Text>
            </View>
            <TextInput
              testID="notes-input"
              placeholder="No notes"
              multiline
              value={notesText}
              editable={false}
              style={[styles.textArea, { backgroundColor: '#F3F4F6' }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={closeNotes}
                testID="notes-close"
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={scanVisible} transparent animationType="fade" onRequestClose={() => setScanVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 0 }]}> 
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Scan size={18} color="#111827" />
                <Text style={styles.modalTitle}>Scan</Text>
              </View>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setScanVisible(false)}>
                <Text style={styles.modalBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 420, backgroundColor: '#000' }}>
              {(
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff' }}>Camera preview not implemented for web demo</Text>
                </View>
              )}
            </View>
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={() => { setScanVisible(false); searchRef.current?.focus(); }}>
                <Text style={styles.modalBtnPrimaryText}>Use Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.stickyFooter} testID="sticky-footer">
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => { searchRef.current?.focus(); }}
          onLongPress={() => setScanVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Scan or Find"
          testID="footer-scan-find"
        >
          <Search size={18} color="#111827" />
          <Text style={styles.footerBtnText}>Scan/Find</Text>
        </TouchableOpacity>
      </View>
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
  searchBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
  },
  highlight: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: '700',
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
  filterRow: {
    marginTop: 10,
  },
  filterRowContent: {
    paddingRight: 20,
    gap: 8,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700' as const,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  groupHeaderSelected: {
    backgroundColor: '#EEF2FF',
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
  timeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  rightBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noteBadgeLabel: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
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
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerPrimary: {
    backgroundColor: '#6366F1',
  },
  footerBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 12,
  },
  footerPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    marginBottom: 10,
    gap: 6,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top' as const,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnSecondary: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnSecondaryText: {
    color: '#111827',
    fontWeight: '700',
  },
  modalBtnDanger: {
    backgroundColor: '#FEE2E2',
  },
  modalBtnDangerText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  modalBtnPrimary: {
    backgroundColor: '#111827',
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});