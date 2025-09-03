import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import {
  Save,
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Table,
  Trash2,
  Plus,
  Gift,
  CreditCard,
  Wallet,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEvents, TableOption } from "@/hooks/events-store";
import DatePickerField from "@/components/DatePickerField";
import TimePickerField from "@/components/TimePickerField";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams();
  const { events, updateEvent } = useEvents();
  const event = events.find((e) => e.id === id);

  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    location: event?.location || "",
    date: event?.date || "",
    time: event?.time || "",
    contractorsNeeded: event?.contractorsNeeded?.toString() || "",
    contractorPay: event?.contractorPay?.toString() || "",
    hostSupervisionFee: event?.hostSupervisionFee?.toString() || "",
    foodStipend: event?.foodStipend?.toString() || "",
    travelStipend: event?.travelStipend?.toString() || "",
    flyerUrl: event?.flyerUrl || "",
    trackingNumber: event?.trackingNumber || "",
    stockUnitsPlanned: (typeof event?.stockUnitsPlanned === 'number' ? String(event?.stockUnitsPlanned) : ""),
    inventoryManagementFee: (typeof event?.inventoryManagementFee === 'number' ? String(event?.inventoryManagementFee) : ""),
  });

  const [tableOptions, setTableOptions] = useState<TableOption[]>(event?.tableOptions || []);
  const [tableQtyInputs, setTableQtyInputs] = useState<Record<string, string>>({});
  const [tableCPTInputs, setTableCPTInputs] = useState<Record<string, string>>({});
  const [stipendMode, setStipendMode] = useState<'gift_card' | 'in_app' | 'external'>(event?.stipendMode ?? 'in_app');
  const [willShipProducts, setWillShipProducts] = useState<boolean | null>(event?.willShipProducts ?? null);
  const [requiresInventoryManagement, setRequiresInventoryManagement] = useState<boolean | null>(event?.requiresInventoryManagement ?? null);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>Event not found</Text>
      </View>
    );
  }

  const addTableOption = () => {
    if (tableOptions.length >= 3) {
      Alert.alert("Limit Reached", "You can add up to 3 table size options.");
      return;
    }
    
    const newTable: TableOption = {
      id: Date.now().toString(),
      size: "",
      price: 0,
      quantity: 1,
      contractorsPerTable: 1,
      availableQuantity: 1,
    };
    setTableOptions([...tableOptions, newTable]);
  };

  useEffect(() => {
    const initialQty: Record<string, string> = {};
    const initialCpt: Record<string, string> = {};
    tableOptions.forEach(t => {
      initialQty[t.id] = t.quantity.toString();
      initialCpt[t.id] = t.contractorsPerTable.toString();
    });
    setTableQtyInputs(initialQty);
    setTableCPTInputs(initialCpt);
  }, [tableOptions]);

  const updateTableOption = (id: string, updates: Partial<TableOption>) => {
    console.log('Edit - updateTableOption called with:', id, updates);
    
    // Validate quantity (0-99)
    if (updates.quantity !== undefined) {
      const quantity = Math.max(0, Math.min(99, updates.quantity));
      updates = { ...updates, quantity };
      console.log('Edit - Validated quantity:', quantity);
    }
    
    // Validate contractors per table (0-6)
    if (updates.contractorsPerTable !== undefined) {
      const contractorsPerTable = Math.max(0, Math.min(6, updates.contractorsPerTable));
      updates = { ...updates, contractorsPerTable };
      console.log('Edit - Validated contractors per table:', contractorsPerTable);
    }
    
    const updatedTableOptions = tableOptions.map(table => 
      table.id === id ? { ...table, ...updates, availableQuantity: updates.quantity !== undefined ? updates.quantity : table.availableQuantity } : table
    );
    
    console.log('Edit - Updated table options:', updatedTableOptions);
    setTableOptions(updatedTableOptions);
  };

  const removeTableOption = (id: string) => {
    setTableOptions(tableOptions.filter(table => table.id !== id));
  };

  const calculateTotalVendorSpaces = () => {
    const total = tableOptions.reduce((total, table) => {
      const spaces = table.quantity * table.contractorsPerTable;
      console.log(`EDIT - Table ${table.size}: ${table.quantity} tables × ${table.contractorsPerTable} contractors = ${spaces} spaces`);
      return total + spaces;
    }, 0);
    console.log('EDIT - Total vendor spaces:', total);
    return total;
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.location.trim() || !formData.date.trim()) {
      Alert.alert("Error", "Please fill in all required fields (Title, Location, Date)");
      return;
    }

    // Validate table options for event hosts
    if (event?.createdBy === 'event_host' && tableOptions.length > 0) {
      const invalidTables = tableOptions.filter(table => 
        !table.size || 
        table.price <= 0 || 
        table.quantity < 0 || table.quantity > 99 ||
        table.contractorsPerTable < 0 || table.contractorsPerTable > 6
      );
      if (invalidTables.length > 0) {
        Alert.alert("Error", "Please fill in all table option details. Quantity must be 0-99 and contractors per table must be 0-6.");
        return;
      }
    }

    const totalVendorSpaces = event?.createdBy === 'event_host' ? calculateTotalVendorSpaces() : undefined;

    const updatedEvent = {
      ...event,
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      date: formData.date.trim(),
      time: formData.time.trim(),
      contractorsNeeded: parseInt(formData.contractorsNeeded) || 0,
      contractorPay: parseFloat(formData.contractorPay) || 0,
      hostSupervisionFee: parseFloat(formData.hostSupervisionFee) || 0,
      foodStipend: formData.foodStipend ? parseFloat(formData.foodStipend) : undefined,
      travelStipend: formData.travelStipend ? parseFloat(formData.travelStipend) : undefined,
      flyerUrl: formData.flyerUrl.trim(),
      tableOptions: event?.createdBy === 'event_host' ? tableOptions : event?.tableOptions,
      totalVendorSpaces,
      stipendMode,
      trackingNumber: formData.trackingNumber || undefined,
      willShipProducts: willShipProducts ?? undefined,
      requiresInventoryManagement: requiresInventoryManagement ?? undefined,
      inventoryManagementFee: formData.inventoryManagementFee ? parseFloat(formData.inventoryManagementFee) : event.inventoryManagementFee,
      stockUnitsPlanned: formData.stockUnitsPlanned ? parseInt(formData.stockUnitsPlanned) || 0 : event.stockUnitsPlanned,
    };

    const changes: string[] = [];
    try {
      if (event.title !== updatedEvent.title) changes.push(`Title: "${event.title}" → "${updatedEvent.title}"`);
      if (event.description !== updatedEvent.description) changes.push('Description updated');
      if (event.location !== updatedEvent.location) changes.push(`Location: "${event.location}" → "${updatedEvent.location}"`);
      if (event.date !== updatedEvent.date) changes.push(`Date: ${event.date} → ${updatedEvent.date}`);
      if (event.time !== updatedEvent.time) changes.push(`Time: ${event.time || '—'} → ${updatedEvent.time || '—'}`);
      if ((event.contractorsNeeded ?? 0) !== updatedEvent.contractorsNeeded) changes.push(`Contractors Needed: ${event.contractorsNeeded ?? 0} → ${updatedEvent.contractorsNeeded}`);
      if ((event.contractorPay ?? 0) !== updatedEvent.contractorPay) changes.push(`Contractor Pay: ${event.contractorPay ?? 0} → ${updatedEvent.contractorPay}`);
      if ((event.hostSupervisionFee ?? 0) !== updatedEvent.hostSupervisionFee) changes.push(`Host Supervision Fee: ${event.hostSupervisionFee ?? 0} → ${updatedEvent.hostSupervisionFee}`);
      const prevFood = event.foodStipend ?? 0;
      const nextFood = updatedEvent.foodStipend ?? 0;
      if (prevFood !== nextFood) changes.push(`Food Stipend: ${prevFood} → ${nextFood}`);
      const prevTravel = event.travelStipend ?? 0;
      const nextTravel = updatedEvent.travelStipend ?? 0;
      if (prevTravel !== nextTravel) changes.push(`Travel Stipend: ${prevTravel} → ${nextTravel}`);
      if (event.flyerUrl !== updatedEvent.flyerUrl) changes.push('Flyer URL updated');
      if (event.createdBy === 'event_host') {
        const prevCount = event.tableOptions?.length ?? 0;
        const nextCount = updatedEvent.tableOptions?.length ?? 0;
        if (prevCount !== nextCount) changes.push(`Table Options: ${prevCount} → ${nextCount}`);
        if ((event.totalVendorSpaces ?? 0) !== (updatedEvent.totalVendorSpaces ?? 0)) changes.push(`Total Vendor Spaces: ${event.totalVendorSpaces ?? 0} → ${updatedEvent.totalVendorSpaces ?? 0}`);
      }
    } catch (e) {
      console.log('Failed to compute change list', e);
    }

    updateEvent(event.id, updatedEvent);

    const message = changes.length > 0 ? changes.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'No visible changes detected.';
    Alert.alert('Changes Saved', message, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes?",
      "Are you sure you want to discard your changes?",
      [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() }
      ]
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Edit Event",
          headerRight: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Event Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Enter event title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Enter event description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <ImageIcon size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Flyer URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.flyerUrl}
                  onChangeText={(text) => setFormData({ ...formData, flyerUrl: text })}
                  placeholder="Enter flyer image URL"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Enter event location"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.inputIcon}>
                  <Calendar size={18} color="#6B7280" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <DatePickerField
                    testID="edit-date"
                    valueISO={formData.date || null}
                    onChange={(iso) => setFormData({ ...formData, date: iso })}
                    placeholder="MM/DD/YYYY"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.inputIcon}>
                  <Clock size={18} color="#6B7280" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TimePickerField
                    testID="edit-time"
                    value={formData.time}
                    onChange={(t) => setFormData({ ...formData, time: t })}
                    placeholder="HH:MM AM/PM"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Users size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contractors Needed</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.contractorsNeeded}
                  onChangeText={(text) => setFormData({ ...formData, contractorsNeeded: text })}
                  placeholder="Number of contractors"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compensation</Text>
            
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <DollarSign size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contractor Pay</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.contractorPay}
                  onChangeText={(text) => setFormData({ ...formData, contractorPay: text })}
                  placeholder="Base pay amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <DollarSign size={18} color="#6B7280" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Host Supervision Fee</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hostSupervisionFee}
                  onChangeText={(text) => setFormData({ ...formData, hostSupervisionFee: text })}
                  placeholder="Supervision fee"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.inputIcon}>
                  <DollarSign size={18} color="#6B7280" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Food Stipend</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.foodStipend}
                    onChangeText={(text) => setFormData({ ...formData, foodStipend: text })}
                    placeholder="Optional"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.inputIcon}>
                  <DollarSign size={18} color="#6B7280" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Travel Stipend</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.travelStipend}
                    onChangeText={(text) => setFormData({ ...formData, travelStipend: text })}
                    placeholder="Optional"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Shipping & Deliverables for Business Owners */}
          {event?.createdBy === 'business_owner' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Products & Shipping</Text>

              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <FileText size={18} color="#6B7280" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Will you ship products?</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity style={[styles.addTableButton, willShipProducts === true && { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]} onPress={() => setWillShipProducts(true)}>
                      <Text style={{ color: '#10B981', fontWeight: '700' }}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addTableButton, willShipProducts === false && { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]} onPress={() => setWillShipProducts(false)}>
                      <Text style={{ color: '#10B981', fontWeight: '700' }}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {willShipProducts === true && (
                <>
                  <View style={styles.inputGroup}>
                    <View style={styles.inputIcon}>
                      <FileText size={18} color="#6B7280" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Tracking Number</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.trackingNumber}
                        onChangeText={(t) => setFormData({ ...formData, trackingNumber: t })}
                        placeholder="Enter carrier tracking number"
                        placeholderTextColor="#9CA3AF"
                        editable={(() => { try { const eventDate = new Date(event?.date ?? ''); return (new Date(eventDate.getTime()).getTime() - Date.now()) > 48 * 3600 * 1000; } catch { return true; } })()}
                      />
                      {(() => { try { const eventDate = new Date(event?.date ?? ''); const hoursLeft = Math.floor(((eventDate.getTime()) - Date.now()) / 3600000); return hoursLeft <= 48 ? <Text style={{ color: '#92400E', marginTop: 6 }}>Tracking edits locked within 48 hours of the event</Text> : null; } catch { return null; } })()}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <View style={styles.inputIcon}>
                        <FileText size={18} color="#6B7280" />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Stock Units Planned</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.stockUnitsPlanned}
                          onChangeText={(t) => setFormData({ ...formData, stockUnitsPlanned: t })}
                          placeholder="e.g., 250"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <View style={styles.inputIcon}>
                        <DollarSign size={18} color="#6B7280" />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Inventory Fee to Host ($)</Text>
                        <TextInput
                          style={styles.textInput}
                          value={formData.inventoryManagementFee}
                          onChangeText={(t) => setFormData({ ...formData, inventoryManagementFee: t })}
                          placeholder="Required if counting"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.inputIcon}>
                      <FileText size={18} color="#6B7280" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Require Inventory Count?</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity style={[styles.addTableButton, requiresInventoryManagement === true && { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]} onPress={() => setRequiresInventoryManagement(true)}>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.addTableButton, requiresInventoryManagement === false && { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]} onPress={() => setRequiresInventoryManagement(false)}>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Stipend Mode Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stipend Mode</Text>
            <View style={styles.stipendOptions}>
              {[
                { key: 'gift_card' as const, label: 'Physical Gift Cards (Host)', icon: Gift },
                { key: 'in_app' as const, label: 'Pay In App (Owner)', icon: CreditCard },
                { key: 'external' as const, label: 'Other Electronic (Zelle/PayPal)', icon: Wallet },
              ].map((opt) => {
                const IconComp = opt.icon;
                const selected = stipendMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    testID={`stipend-${opt.key}`}
                    style={[styles.stipendOption, selected && styles.stipendOptionSelected]}
                    onPress={() => setStipendMode(opt.key)}
                  >
                    <IconComp size={18} color={selected ? "#10B981" : "#6B7280"} />
                    <Text style={[styles.stipendOptionText, selected && styles.stipendOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? "#10B981" : "#D1D5DB", backgroundColor: selected ? "#10B981" : "#FFFFFF" }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {event?.createdBy === 'event_host' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Table Options</Text>
                <Text style={styles.sectionSubtitle}>Set up to 3 table sizes with pricing and availability</Text>
              </View>
              
              {tableOptions.map((table, index) => (
                <View key={table.id} style={styles.tableOptionCard}>
                  <View style={styles.tableOptionHeader}>
                    <View style={styles.tableOptionTitle}>
                      <Table size={20} color="#10B981" />
                      <Text style={styles.tableOptionLabel}>Table Option {index + 1}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeTableButton}
                      onPress={() => removeTableOption(table.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.tableOptionInputs}>
                    <View style={styles.tableInputRow}>
                      <View style={styles.tableInputHalf}>
                        <Text style={styles.tableInputLabel}>Table Size</Text>
                        <TextInput
                          style={styles.tableInput}
                          placeholder="e.g., Small (6ft)"
                          value={table.size}
                          onChangeText={(text) => updateTableOption(table.id, { size: text })}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={styles.tableInputHalf}>
                        <Text style={styles.tableInputLabel}>Price ($)</Text>
                        <TextInput
                          style={styles.tableInput}
                          placeholder="100"
                          value={table.price.toString()}
                          onChangeText={(text) => updateTableOption(table.id, { price: parseFloat(text) || 0 })}
                          keyboardType="numeric"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                    
                    <View style={styles.tableInputRow}>
                      <View style={styles.tableInputHalf}>
                        <Text style={styles.tableInputLabel}>Quantity Available (0-99)</Text>
                        <TextInput
                          testID={`qty-input-${table.id}`}
                          style={styles.tableInput}
                          placeholder="5"
                          value={tableQtyInputs[table.id] ?? table.quantity.toString()}
                          onChangeText={(text) => {
                            setTableQtyInputs(prev => ({ ...prev, [table.id]: text }));
                          }}
                          onBlur={() => {
                            const raw = tableQtyInputs[table.id] ?? table.quantity.toString();
                            const parsed = Math.max(0, Math.min(99, parseInt(raw || '0') || 0));
                            console.log('EDIT - onBlur qty parsed', parsed);
                            updateTableOption(table.id, { quantity: parsed });
                            setTableQtyInputs(prev => ({ ...prev, [table.id]: parsed.toString() }));
                          }}
                          keyboardType="numeric"
                          placeholderTextColor="#9CA3AF"
                          maxLength={2}
                        />
                      </View>
                      <View style={styles.tableInputHalf}>
                        <Text style={styles.tableInputLabel}>Contractors per Table (0-6)</Text>
                        <TextInput
                          testID={`cpt-input-${table.id}`}
                          style={styles.tableInput}
                          placeholder="2"
                          value={tableCPTInputs[table.id] ?? table.contractorsPerTable.toString()}
                          onChangeText={(text) => {
                            setTableCPTInputs(prev => ({ ...prev, [table.id]: text }));
                          }}
                          onBlur={() => {
                            const raw = tableCPTInputs[table.id] ?? table.contractorsPerTable.toString();
                            const parsed = Math.max(0, Math.min(6, parseInt(raw || '0') || 0));
                            console.log('EDIT - onBlur cpt parsed', parsed);
                            updateTableOption(table.id, { contractorsPerTable: parsed });
                            setTableCPTInputs(prev => ({ ...prev, [table.id]: parsed.toString() }));
                          }}
                          keyboardType="numeric"
                          placeholderTextColor="#9CA3AF"
                          maxLength={1}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              
              {tableOptions.length < 3 && (
                <TouchableOpacity style={styles.addTableButton} onPress={addTableOption}>
                  <Plus size={20} color="#10B981" />
                  <Text style={styles.addTableText}>Add Table Option</Text>
                </TouchableOpacity>
              )}
              
              {tableOptions.length > 0 && (
                <View style={styles.vendorSpacesSummary}>
                  <Text style={styles.vendorSpacesText}>
                    Total Vendor Spaces: {calculateTotalVendorSpaces()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveText}>Save Changes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 4,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: "#111827",
    padding: 0,
    minHeight: 24,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
  saveGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerButton: {
    padding: 4,
  },
  bottomSpacing: {
    height: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  tableOptionCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  tableOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tableOptionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  removeTableButton: {
    padding: 4,
  },
  tableOptionInputs: {
    gap: 12,
  },
  tableInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  tableInputHalf: {
    flex: 1,
  },
  tableInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  tableInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    fontSize: 15,
    color: "#111827",
  },
  addTableButton: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#10B981",
    borderStyle: "dashed",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addTableText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  vendorSpacesSummary: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  vendorSpacesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0369A1",
    textAlign: "center",
  },
  stipendOptions: {
    gap: 12,
  },
  stipendOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    justifyContent: "space-between",
  },
  stipendOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  stipendOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 8,
  },
  stipendOptionTextSelected: {
    color: "#10B981",
    fontWeight: "600",
  },
});