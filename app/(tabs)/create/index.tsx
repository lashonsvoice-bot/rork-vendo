import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  Modal,
  FlatList,

} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Users,
  FileText,
  Image as ImageIcon,
  Plus,
  Upload,
  X,
  Globe,
  Building2,
  CheckSquare,
  Square,
  Info,
  Store,
  Table,
  Trash2,
  Gift,
  CreditCard,
  Wallet,
} from "lucide-react-native";
import { useEvents, TableOption } from "@/hooks/events-store";
import { useUser } from "@/hooks/user-store";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DatePickerField from "@/components/DatePickerField";
import TimePickerField from "@/components/TimePickerField";

interface FormDataType {
  title: string;
  description: string;
  businessName: string;
  organizationName: string;
  website: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  contractorsNeeded: string;
  contractorPay: string;
  hostSupervisionFee: string;
}

export default function CreateEventScreen() {
  const { addEvent, addVendorToEvent } = useEvents();
  const { userRole, currentUser, contractors } = useUser();
  const router = useRouter();

  const [formData, setFormData] = useState<FormDataType>({
    title: "",
    description: "",
    businessName: userRole === 'business_owner' ? (currentUser as any)?.businessName || "" : "",
    organizationName: userRole === 'event_host' ? (currentUser as any)?.organizationName || "" : "",
    website: (currentUser as any)?.website || "",
    location: userRole === 'event_host' ? (currentUser as any)?.location || "" : "",
    date: "",
    startTime: "",
    endTime: "",
    contractorsNeeded: "",
    contractorPay: "",
    hostSupervisionFee: "",
  });

  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);
  const [contractorPickerVisible, setContractorPickerVisible] = useState<boolean>(false);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [contractorSearch, setContractorSearch] = useState<string>("");
  const [tableQtyInputs, setTableQtyInputs] = useState<Record<string, string>>({});
  const [tableCPTInputs, setTableCPTInputs] = useState<Record<string, string>>({});

  const [flyerImage, setFlyerImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInsurance, setHasInsurance] = useState<boolean | null>(null);
  const [wantsInsuranceContact, setWantsInsuranceContact] = useState<boolean>(false);
  const [expectedAttendees, setExpectedAttendees] = useState<string>("");
  const [marketingMethods, setMarketingMethods] = useState<string[]>([]);
  const [otherMarketing, setOtherMarketing] = useState<string>("");
  const [eventFrequency, setEventFrequency] = useState<string | undefined>(undefined);
  const [stipendMode, setStipendMode] = useState<'gift_card' | 'in_app' | 'external'>('in_app');
  const [listVenueInDirectory, setListVenueInDirectory] = useState<boolean>(false);
  const [optInListings, setOptInListings] = useState<boolean>(false);
  const [isPrivateEvent, setIsPrivateEvent] = useState<boolean>(false);
  const [isPrivatePremium, setIsPrivatePremium] = useState<boolean>(false);
  const [privateNotes, setPrivateNotes] = useState<string>("Private event: contractors must adhere to strict guidelines.");
  const [hasDressCode, setHasDressCode] = useState<boolean>(false);
  const [dressCode, setDressCode] = useState<string>("");
  const [hasParkingInfo, setHasParkingInfo] = useState<boolean>(false);
  const [parkingInfo, setParkingInfo] = useState<string>("");
  const [hasMiscInfo, setHasMiscInfo] = useState<boolean>(false);
  const [miscInfo, setMiscInfo] = useState<string>("");

  const { events } = useEvents();
  const workedContractorIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach(ev => {
      (ev.vendors ?? []).forEach(v => { if (v.contractorId) ids.add(v.contractorId); });
    });
    return Array.from(ids);
  }, [events]);


  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload flyers.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFlyerImage(result.assets[0].uri);
    }
  };

  const removeFlyerImage = () => {
    setFlyerImage(null);
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

  const updateTableOption = (id: string, updates: Partial<TableOption>) => {
    console.log('CREATE - updateTableOption called with:', id, updates);
    
    // Validate quantity (0-99)
    if (updates.quantity !== undefined) {
      const quantity = Math.max(0, Math.min(99, updates.quantity));
      updates = { ...updates, quantity };
      console.log('CREATE - Validated quantity:', quantity);
    }
    
    // Validate contractors per table (0-6)
    if (updates.contractorsPerTable !== undefined) {
      const contractorsPerTable = Math.max(0, Math.min(6, updates.contractorsPerTable));
      updates = { ...updates, contractorsPerTable };
      console.log('CREATE - Validated contractors per table:', contractorsPerTable);
    }
    
    const updatedTableOptions = tableOptions.map(table => {
      if (table.id === id) {
        const updatedTable = { 
          ...table, 
          ...updates, 
          availableQuantity: updates.quantity !== undefined ? updates.quantity : table.availableQuantity 
        };
        console.log('CREATE - Updated table:', updatedTable);
        return updatedTable;
      }
      return table;
    });
    
    console.log('CREATE - All updated table options:', updatedTableOptions);
    setTableOptions(updatedTableOptions);
  };

  const removeTableOption = (id: string) => {
    setTableOptions(tableOptions.filter(table => table.id !== id));
  };

  const calculateTotalVendorSpaces = () => {
    const total = tableOptions.reduce((total, table) => {
      const spaces = table.quantity * table.contractorsPerTable;
      console.log(`CREATE - Table ${table.size}: ${table.quantity} tables × ${table.contractorsPerTable} contractors = ${spaces} spaces`);
      return total + spaces;
    }, 0);
    console.log('CREATE - Total vendor spaces:', total);
    return total;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.location || !formData.date) {
      Alert.alert("Error", "Please fill in all required fields (title, location, and date)");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      Alert.alert("Error", "Please provide both a start time and an end time");
      return;
    }

    if (userRole === 'business_owner' && (!formData.contractorsNeeded || !formData.contractorPay)) {
      Alert.alert("Error", "Please fill in contractors needed and contractor pay");
      return;
    }

    if (userRole === 'event_host' && tableOptions.length === 0) {
      Alert.alert("Error", "Please add at least one table option for your event");
      return;
    }

    if (userRole === 'event_host') {
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

    if (!flyerImage) {
      Alert.alert("Error", "Please upload an event flyer");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalVendorSpaces = userRole === 'event_host' ? calculateTotalVendorSpaces() : undefined;
      
      const newEvent = {
        title: formData.title,
        description: formData.description,
        businessName: userRole === 'business_owner' ? formData.businessName : undefined,
        businessOwnerId: userRole === 'business_owner' ? currentUser?.id : undefined,
        eventHostId: userRole === 'event_host' ? currentUser?.id : undefined,
        eventHostName: userRole === 'event_host' ? formData.organizationName : undefined,
        website: formData.website || undefined,
        location: formData.location,
        date: formData.date,
        time: `${formData.startTime} - ${formData.endTime}`,
        contractorsNeeded: userRole === 'business_owner' ? parseInt(formData.contractorsNeeded) || 1 : 0,
        contractorPay: userRole === 'business_owner' ? parseFloat(formData.contractorPay) || 0 : 0,
        hostSupervisionFee: parseFloat(formData.hostSupervisionFee) || 0,
        flyerUrl: flyerImage,
        createdBy: (userRole ?? 'contractor') as 'business_owner' | 'event_host' | 'contractor',
        tableOptions: userRole === 'event_host' ? tableOptions : undefined,
        totalVendorSpaces,
        hasInsurance,
        wantsInsuranceContact: hasInsurance === false ? wantsInsuranceContact : false,
        expectedAttendees: userRole === 'event_host' ? parseInt(expectedAttendees) || 0 : undefined,
        marketingMethods: userRole === 'event_host' ? [...marketingMethods, ...(otherMarketing ? [otherMarketing] : [])] : undefined,
        eventFrequency: userRole === 'event_host' ? (eventFrequency ?? undefined) : undefined,
        stipendMode,
        optInListings,
        ...(userRole === 'event_host' ? {
          isPrivateEvent,
          privateNotes: isPrivateEvent ? privateNotes : undefined,
          privatePremium: isPrivateEvent ? isPrivatePremium : undefined,
          requirements: {
            dressCodeEnabled: hasDressCode,
            dressCode: hasDressCode ? dressCode : undefined,
            parkingInfoEnabled: hasParkingInfo,
            parkingInfo: hasParkingInfo ? parkingInfo : undefined,
            miscInfoEnabled: hasMiscInfo,
            miscInfo: hasMiscInfo ? miscInfo : undefined,
          },
          listVenueInDirectory,
        } : {}),
      };

      const created = addEvent(newEvent);
      if (userRole === 'business_owner' && selectedContractorIds.length > 0 && created?.id) {
        const vendorLabel = (formData.businessName || (currentUser as any)?.businessName || "Vendor");
        selectedContractorIds.forEach((cid) => {
          try {
            addVendorToEvent(created.id, vendorLabel, cid);
          } catch {}
        });
      }
      const successMessage = userRole === 'business_owner' 
        ? "Opportunity listed successfully! Contractors will now be able to see and apply for this opportunity."
        : "Event listed successfully! Business owners can now find your event and hire contractors for vendor spots.";
      
      Alert.alert("Success", successMessage, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to list opportunity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputSections = [
    {
      title: "Event Information",
      fields: [
        {
          label: "Event Title",
          placeholder: "Enter event title",
          value: formData.title,
          key: "title",
          icon: Info,
          required: true,
        },
        {
          label: "Description",
          placeholder: userRole === 'business_owner' 
            ? "Describe the event and vendor requirements"
            : "Describe your event and available vendor opportunities",
          value: formData.description,
          key: "description",
          icon: FileText,
          multiline: true,
        },
        ...(userRole === 'business_owner' ? [
          {
            label: "Business Name",
            placeholder: "Your business name",
            value: formData.businessName,
            key: "businessName",
            icon: Building2,
          },
        ] : [
          {
            label: "Organization Name",
            placeholder: "Your organization/event company name",
            value: formData.organizationName,
            key: "organizationName",
            icon: Store,
          },
        ]),
        {
          label: "Website (Optional)",
          placeholder: "https://example.com",
          value: formData.website,
          key: "website",
          icon: Globe,
        },
      ],
    },
    {
      title: "Location & Time",
      fields: [
        {
          label: "Location",
          placeholder: "Event venue address, City, State",
          value: formData.location,
          key: "location",
          icon: MapPin,
          required: true,
        },
        {
          label: "Date",
          placeholder: "MM/DD/YYYY",
          value: formData.date,
          key: "date",
          icon: Calendar,
          required: true,
          type: 'date' as const,
        },
        {
          label: "Start Time",
          placeholder: "e.g., 10:00 AM",
          value: formData.startTime,
          key: "startTime",
          icon: Clock,
          required: true,
          type: 'time' as const,
        },
        {
          label: "End Time",
          placeholder: "e.g., 6:00 PM",
          value: formData.endTime,
          key: "endTime",
          icon: Clock,
          required: true,
          type: 'time' as const,
        },
      ],
    },
    {
      title: "Event Details",
      fields: userRole === 'event_host' ? [
        {
          label: "Expected Number of Attendees",
          placeholder: "500",
          value: expectedAttendees,
          key: "expectedAttendees",
          icon: Users,
          keyboardType: "numeric",
        },
      ] : [],
    },
    {
      title: "Event Insurance",
      fields: [],
    },
    ...(userRole === 'business_owner' ? [{
      title: "Staffing & Compensation",
      fields: [
        {
          label: "Number of Contractors",
          placeholder: "How many contractors needed?",
          value: formData.contractorsNeeded,
          key: "contractorsNeeded",
          icon: Users,
          keyboardType: "numeric",
          required: true,
        },
        {
          label: "Pay per Contractor ($)",
          placeholder: "150",
          value: formData.contractorPay,
          key: "contractorPay",
          icon: DollarSign,
          keyboardType: "numeric",
          required: true,
        },
        {
          label: "Host Supervision Fee ($)",
          placeholder: "50",
          value: formData.hostSupervisionFee,
          key: "hostSupervisionFee",
          icon: DollarSign,
          keyboardType: "numeric",
        },
      ],
    }] : [{
      title: "Event Host Information",
      fields: [
        {
          label: "Your Supervision Fee ($)",
          placeholder: "50",
          value: formData.hostSupervisionFee,
          key: "hostSupervisionFee",
          icon: DollarSign,
          keyboardType: "numeric",
        },
      ],
    }]),
  ];

  
  if (userRole === null) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Building2 size={48} color="#6B7280" />
          <Text style={styles.accessDeniedTitle}>Please Log In</Text>
          <Text style={styles.accessDeniedText}>
            You need to be logged in to create an event.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Flyer *</Text>
          {flyerImage ? (
            <View style={styles.flyerContainer}>
              <Image source={{ uri: flyerImage }} style={styles.flyerImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeFlyerButton} onPress={removeFlyerImage}>
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.changeFlyerButton} onPress={pickImage}>
                <Upload size={16} color="#10B981" />
                <Text style={styles.changeFlyerText}>Change Flyer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <ImageIcon size={24} color="#10B981" />
              <Text style={styles.uploadText}>Upload Event Flyer</Text>
              <Text style={styles.uploadSubtext}>JPG, PNG up to 10MB - Required</Text>
            </TouchableOpacity>
          )}
        </View>

        {inputSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.fields.map((field, fieldIndex) => {
              const Icon = field.icon;
              return (
                <View key={fieldIndex} style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {field.label}
                    {field.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <View style={styles.inputContainer}>
                    <Icon size={18} color="#9CA3AF" style={styles.inputIcon} />
                    {(field as any).type === 'date' ? (
                      <DatePickerField
                        testID={`date-${field.key}`}
                        valueISO={field.value ? field.value : null}
                        onChange={(iso) => setFormData({ ...formData, [field.key]: iso })}
                        placeholder={field.placeholder}
                      />
                    ) : (field as any).type === 'time' ? (
                      <TimePickerField
                        testID={`time-${field.key}`}
                        value={field.value}
                        onChange={(t) => setFormData({ ...formData, [field.key]: t })}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <TextInput
                        style={[styles.input, (field as any).multiline === true && styles.textArea]}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChangeText={(text) =>
                          setFormData({ ...formData, [field.key]: text })
                        }
                        keyboardType={(field as any).keyboardType || "default"}
                        multiline={(field as any).multiline === true}
                        numberOfLines={(field as any).multiline === true ? 4 : 1}
                        placeholderTextColor="#9CA3AF"
                      />
                    )}
                  </View>
                </View>
              );
            })}
            {userRole === 'business_owner' && sectionIndex === 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign Past Contractors (optional)</Text>
                <TouchableOpacity
                  testID="open-contractor-picker"
                  onPress={() => setContractorPickerVisible(true)}
                  style={styles.inputContainer}
                >
                  <Users size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <Text style={styles.pickerText}>
                    {selectedContractorIds.length === 0 ? 'Select contractors' : `${selectedContractorIds.length} selected`}
                  </Text>
                </TouchableOpacity>
                {selectedContractorIds.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {selectedContractorIds.map((id) => {
                      const c = contractors.find((cc) => cc.id === id);
                      const name = c?.name ?? 'Contractor';
                      return (
                        <View key={id} style={styles.chip}>
                          <Text style={styles.chipText}>{name}</Text>
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => setSelectedContractorIds(prev => prev.filter(pid => pid !== id))}
                            style={styles.chipRemove}
                          >
                            <X size={12} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            
            {/* Event Details Section for Event Hosts */}
            {userRole === 'event_host' && sectionIndex === inputSections.findIndex(s => s.title === "Event Details") && (
              <>
                {/* Marketing Methods */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>How are you marketing the event?</Text>
                  <View style={styles.marketingGrid}>
                    {[
                      'Newspaper',
                      'Email List', 
                      'Social Media',
                      'Forums',
                      'Television'
                    ].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.marketingOption, marketingMethods.includes(method) && styles.marketingOptionSelected]}
                        onPress={() => {
                          setMarketingMethods(prev => 
                            prev.includes(method) 
                              ? prev.filter(m => m !== method)
                              : [...prev, method]
                          );
                        }}
                      >
                        {marketingMethods.includes(method) ? (
                          <CheckSquare size={18} color="#10B981" />
                        ) : (
                          <Square size={18} color="#9CA3AF" />
                        )}
                        <Text style={[styles.marketingOptionText, marketingMethods.includes(method) && styles.marketingOptionTextSelected]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.inputContainer}>
                    <FileText size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Other marketing method"
                      value={otherMarketing}
                      onChangeText={setOtherMarketing}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {/* Event Frequency */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Is this a repeated event?</Text>
                  <View style={styles.frequencyOptions}>
                    {[
                      { key: 'monthly', label: 'Monthly' },
                      { key: 'semi-annual', label: 'Semi-Annual' },
                      { key: 'annual', label: 'Annual' },
                      { key: 'one-time', label: 'One-Time Event' }
                    ].map((freq) => (
                      <TouchableOpacity
                        key={freq.key}
                        style={[styles.frequencyOption, eventFrequency === freq.key && styles.frequencyOptionSelected]}
                        onPress={() => setEventFrequency(freq.key)}
                      >
                        <View style={[styles.radioButton, eventFrequency === freq.key && styles.radioButtonSelected]} />
                        <Text style={[styles.frequencyOptionText, eventFrequency === freq.key && styles.frequencyOptionTextSelected]}>
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Insurance Section */}
            {sectionIndex === inputSections.findIndex(s => s.title === "Event Insurance") && (
              <View style={styles.insuranceSection}>
                <View style={styles.insuranceQuestion}>
                  <Text style={styles.insuranceQuestionText}>Do you have insurance for your event?</Text>
                  <View style={styles.insuranceOptions}>
                    <TouchableOpacity
                      style={[styles.insuranceOption, hasInsurance === true && styles.insuranceOptionSelected]}
                      onPress={() => {
                        setHasInsurance(true);
                        setWantsInsuranceContact(false);
                      }}
                    >
                      <View style={[styles.radioButton, hasInsurance === true && styles.radioButtonSelected]} />
                      <Text style={[styles.insuranceOptionText, hasInsurance === true && styles.insuranceOptionTextSelected]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.insuranceOption, hasInsurance === false && styles.insuranceOptionSelected]}
                      onPress={() => setHasInsurance(false)}
                    >
                      <View style={[styles.radioButton, hasInsurance === false && styles.radioButtonSelected]} />
                      <Text style={[styles.insuranceOptionText, hasInsurance === false && styles.insuranceOptionTextSelected]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {hasInsurance === false && (
                  <View style={styles.insuranceFollowUp}>
                    <Text style={styles.insuranceFollowUpText}>
                      Would you like an insurance provider to contact you with affordable event insurance rates as low as $60? 
                      Covers accident protection, injuries, damage, and event cancellation costs.
                    </Text>
                    <View style={styles.insuranceOptions}>
                      <TouchableOpacity
                        style={[styles.insuranceOption, wantsInsuranceContact === true && styles.insuranceOptionSelected]}
                        onPress={() => setWantsInsuranceContact(true)}
                      >
                        <View style={[styles.radioButton, wantsInsuranceContact === true && styles.radioButtonSelected]} />
                        <Text style={[styles.insuranceOptionText, wantsInsuranceContact === true && styles.insuranceOptionTextSelected]}>Yes, contact me</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.insuranceOption, wantsInsuranceContact === false && styles.insuranceOptionSelected]}
                        onPress={() => setWantsInsuranceContact(false)}
                      >
                        <View style={[styles.radioButton, wantsInsuranceContact === false && styles.radioButtonSelected]} />
                        <Text style={[styles.insuranceOptionText, wantsInsuranceContact === false && styles.insuranceOptionTextSelected]}>No thanks</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

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
                  <View style={[styles.radioButton, selected && styles.radioButtonSelected]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility & Policies</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              testID="toggle-opt-in-listings"
              style={[styles.toggleButton, optInListings && styles.toggleButtonOn]}
              onPress={() => setOptInListings(!optInListings)}
            >
              <View style={[styles.radioButton, optInListings && styles.radioButtonSelected]} />
              <Text style={[styles.toggleLabel, optInListings && styles.toggleLabelOn]}>List this in public directories</Text>
            </TouchableOpacity>
          </View>

          {userRole === 'event_host' && (
            <>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  testID="toggle-private-event"
                  style={[styles.toggleButton, isPrivateEvent && styles.toggleButtonOn]}
                  onPress={() => setIsPrivateEvent(!isPrivateEvent)}
                >
                  <View style={[styles.radioButton, isPrivateEvent && styles.radioButtonSelected]} />
                  <Text style={[styles.toggleLabel, isPrivateEvent && styles.toggleLabelOn]}>This is a private event</Text>
                </TouchableOpacity>
              </View>

              {isPrivateEvent && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Private Event Note</Text>
                    <View style={styles.inputContainer}>
                      <FileText size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        testID="private-notes"
                        style={[styles.input, styles.textArea]}
                        placeholder="Add notes for private event policies"
                        value={privateNotes}
                        onChangeText={setPrivateNotes}
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      testID="toggle-private-premium"
                      style={[styles.toggleButton, isPrivatePremium && styles.toggleButtonOn]}
                      onPress={() => setIsPrivatePremium(!isPrivatePremium)}
                    >
                      <View style={[styles.radioButton, isPrivatePremium && styles.radioButtonSelected]} />
                      <Text style={[styles.toggleLabel, isPrivatePremium && styles.toggleLabelOn]}>Mark as premium private engagement</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[styles.sectionSubtitle, { marginTop: 8 }]}>Contractor Requirements</Text>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  testID="toggle-dress-code"
                  style={[styles.toggleButton, hasDressCode && styles.toggleButtonOn]}
                  onPress={() => setHasDressCode(!hasDressCode)}
                >
                  <View style={[styles.radioButton, hasDressCode && styles.radioButtonSelected]} />
                  <Text style={[styles.toggleLabel, hasDressCode && styles.toggleLabelOn]}>Dress code</Text>
                </TouchableOpacity>
              </View>
              {hasDressCode && (
                <View style={styles.inputContainer}>
                  <FileText size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    testID="dress-code"
                    style={styles.input}
                    placeholder="e.g., Black slacks, white shirt, closed-toe shoes"
                    value={dressCode}
                    onChangeText={setDressCode}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  testID="toggle-parking-info"
                  style={[styles.toggleButton, hasParkingInfo && styles.toggleButtonOn]}
                  onPress={() => setHasParkingInfo(!hasParkingInfo)}
                >
                  <View style={[styles.radioButton, hasParkingInfo && styles.radioButtonSelected]} />
                  <Text style={[styles.toggleLabel, hasParkingInfo && styles.toggleLabelOn]}>Parking information</Text>
                </TouchableOpacity>
              </View>
              {hasParkingInfo && (
                <View style={styles.inputContainer}>
                  <FileText size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    testID="parking-info"
                    style={styles.input}
                    placeholder="e.g., Lot C entrance, bring $10 cash, validate at booth"
                    value={parkingInfo}
                    onChangeText={setParkingInfo}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  testID="toggle-misc-info"
                  style={[styles.toggleButton, hasMiscInfo && styles.toggleButtonOn]}
                  onPress={() => setHasMiscInfo(!hasMiscInfo)}
                >
                  <View style={[styles.radioButton, hasMiscInfo && styles.radioButtonSelected]} />
                  <Text style={[styles.toggleLabel, hasMiscInfo && styles.toggleLabelOn]}>Miscellaneous notes</Text>
                </TouchableOpacity>
              </View>
              {hasMiscInfo && (
                <View style={styles.inputContainer}>
                  <FileText size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    testID="misc-info"
                    style={styles.input}
                    placeholder="Any other requirements or important details"
                    value={miscInfo}
                    onChangeText={setMiscInfo}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  testID="toggle-venue-directory"
                  style={[styles.toggleButton, listVenueInDirectory && styles.toggleButtonOn]}
                  onPress={() => setListVenueInDirectory(!listVenueInDirectory)}
                >
                  <View style={[styles.radioButton, listVenueInDirectory && styles.radioButtonSelected]} />
                  <Text style={[styles.toggleLabel, listVenueInDirectory && styles.toggleLabelOn]}>List venue in Venue Directory</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {userRole === 'event_host' && (
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
                          console.log('CREATE - onBlur qty parsed', parsed);
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
                          console.log('CREATE - onBlur cpt parsed', parsed);
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



        <Modal
          visible={contractorPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setContractorPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Past Contractors</Text>
                <TouchableOpacity onPress={() => setContractorPickerVisible(false)}>
                  <X size={20} color="#374151" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Users size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  testID="contractor-search"
                  style={styles.input}
                  placeholder="Search contractors by name or state"
                  placeholderTextColor="#9CA3AF"
                  value={contractorSearch}
                  onChangeText={setContractorSearch}
                />
              </View>
              <FlatList
                data={contractors
                  .filter(c => workedContractorIds.includes(c.id) && typeof c.rating === 'number')
                  .filter(c => {
                    const q = contractorSearch.toLowerCase();
                    const name = c.name.toLowerCase();
                    const state = (c.location ?? '').toLowerCase();
                    return name.includes(q) || state.includes(q);
                  })
                  .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                }
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const checked = selectedContractorIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      testID={`contractor-${item.id}`}
                      style={[styles.row, checked && styles.rowChecked]}
                      onPress={() => {
                        setSelectedContractorIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                      }}
                    >
                      <View style={styles.rowMain}>
                        <Text style={styles.rowTitle}>{item.name} • {(item.rating ?? 0).toFixed(1)}★</Text>
                        <Text style={styles.rowSub}>{item.location} • {(item.skills ?? []).slice(0,2).join(', ')}</Text>
                      </View>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                testID="apply-contractors"
                style={styles.modalApply}
                onPress={() => setContractorPickerVisible(false)}
              >
                <Text style={styles.modalApplyText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        testID="submit-create-event">
          <LinearGradient
            colors={isSubmitting ? ["#9CA3AF", "#6B7280"] : ["#10B981", "#34D399"]}
            style={styles.submitGradient}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.submitText}>
              {isSubmitting 
                ? (userRole === 'business_owner' ? "Listing Opportunity..." : "Listing Event...") 
                : (userRole === 'business_owner' ? "List Opportunity" : "List Event FREE")
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>How it works:</Text>
          <Text style={styles.helpText}>
            {userRole === 'business_owner' 
              ? "1. List your opportunity with all details and upload a flyer\n2. Set contractor requirements and payment\n3. Contractors will apply for your opportunity\n4. Review and select the best contractors\n5. Manage your event and pay contractors after completion"
              : "1. List your event with details and a flyer\n2. Share availability and any vendor info\n3. Business owners can reach out with proposals\n4. Coordinate details in Messages\n5. Manage your event day-of"
            }
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginTop: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  uploadButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  flyerContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  flyerImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F3F4F6",
  },
  removeFlyerButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
  changeFlyerButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeFlyerText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },

  submitButton: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  helpSection: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0369A1",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 20,
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  accessDeniedText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 40,
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  pickerText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  chipText: {
    color: "#3730A3",
    fontSize: 13,
    fontWeight: "600",
  },
  chipRemove: {
    backgroundColor: "#E5E7EB",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  listContent: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowChecked: {
    backgroundColor: "#F8FAFF",
  },
  rowMain: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  rowSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  modalApply: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  modalApplyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  insuranceSection: {
    marginTop: 8,
  },
  insuranceQuestion: {
    marginBottom: 16,
  },
  insuranceQuestionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  insuranceOptions: {
    flexDirection: "row",
    gap: 16,
  },
  insuranceOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flex: 1,
  },
  insuranceOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  insuranceOptionText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  insuranceOptionTextSelected: {
    color: "#10B981",
    fontWeight: "600",
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  radioButtonSelected: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
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
  insuranceFollowUp: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  insuranceFollowUpText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
    marginBottom: 12,
  },
  marketingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  marketingOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: "45%",
  },
  marketingOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  marketingOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  marketingOptionTextSelected: {
    color: "#10B981",
    fontWeight: "600",
  },
  frequencyOptions: {
    gap: 12,
  },
  frequencyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  frequencyOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  frequencyOptionText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  frequencyOptionTextSelected: {
    color: "#10B981",
    fontWeight: "600",
  },
  toggleRow: {
    marginBottom: 12,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  toggleButtonOn: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  toggleLabel: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  toggleLabelOn: {
    color: "#10B981",
    fontWeight: "600",
  },
});