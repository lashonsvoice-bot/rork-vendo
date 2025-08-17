import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  CheckCircle,
  Camera,
  Plus,
  User,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  Edit3,
  Save,
  X,
  Star,
  MessageSquare,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEvents, VendorCheckIn, VendorReview } from "@/hooks/events-store";
import * as ImagePicker from "expo-image-picker";

type CheckInStage = 'arrival' | 'halfway' | 'end';

export default function ManageVendorScreen() {
  const { id } = useLocalSearchParams();
  const { events, updateVendorCheckIn, addVendorToEvent, addVendorReview, updateEvent } = useEvents();
  const event = events.find((e) => e.id === id);
  
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingVendor, setReviewingVendor] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [tipAmount, setTipAmount] = useState("0");
  const [hostResponse, setHostResponse] = useState("");
  const [editingTableLabel, setEditingTableLabel] = useState<string | null>(null);
  const [tempTableLabel, setTempTableLabel] = useState("");
  const [stipendMode, setStipendMode] = useState<import("@/hooks/events-store").Event["stipendReleaseMethod"]>((event?.stipendReleaseMethod ?? 'notification'));
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteVendorId, setQuickNoteVendorId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState("");

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const vendors = event.vendors || [];
  const completedVendors = vendors.filter(v => v.endConfirmed && v.fundsReleased).length;
  const totalEarnings = completedVendors * (event.contractorPay + (event.foodStipend || 0) + (event.travelStipend || 0));

  const handleAddVendor = () => {
    if (newVendorName.trim()) {
      addVendorToEvent(event.id, newVendorName.trim());
      setNewVendorName("");
      setShowAddVendor(false);
    }
  };

  // Manual check-in removed to prevent host dishonesty
  // Contractors must check in via their app with digital passes

  const handleReleaseFunds = (vendorId: string) => {
    Alert.alert(
      "Release Funds",
      "Are you sure you want to release funds for this vendor? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release",
          style: "destructive",
          onPress: () => {
            updateVendorCheckIn(event.id, vendorId, { fundsReleased: true });
            setReviewingVendor(vendorId);
            setShowReviewModal(true);
          },
        },
      ]
    );
  };

  const handleSubmitReview = () => {
    if (!reviewingVendor) return;
    
    if (reviewRating === 0) {
      Alert.alert("Rating Required", "Please select a star rating before submitting.");
      return;
    }

    if (reviewRating === 1 && !hostResponse.trim()) {
      Alert.alert(
        "Response Required", 
        "A 1-star rating requires an explanation. Please provide details about what went wrong."
      );
      return;
    }
    
    const review: Omit<VendorReview, 'reviewDate' | 'isRehirable'> = {
      rating: reviewRating,
      comment: reviewComment.trim(),
      tip: parseFloat(tipAmount) || 0,
      hostResponse: reviewRating === 1 ? hostResponse.trim() : undefined,
    };
    
    addVendorReview(event.id, reviewingVendor, review);
    
    setShowReviewModal(false);
    setReviewingVendor(null);
    setReviewRating(0);
    setReviewComment("");
    setTipAmount("0");
    setHostResponse("");
    
    const rehirableStatus = reviewRating >= 2 ? "rehirable" : "not rehirable";
    Alert.alert(
      "Review Submitted",
      `Thank you for your feedback! This contractor has been marked as ${rehirableStatus}. ${review.tip > 0 ? `A tip of ${review.tip} has been added.` : ''}`
    );
  };

  const renderStarRating = (rating: number, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            disabled={!onPress}
            style={styles.starButton}
          >
            <Star
              size={onPress ? 32 : 16}
              color={star <= rating ? "#F59E0B" : "#E5E7EB"}
              fill={star <= rating ? "#F59E0B" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return "Not Rehirable";
      case 2: return "Below Average";
      case 3: return "Average";
      case 4: return "Highly Recommend";
      case 5: return "Excellent";
      default: return "Select Rating";
    }
  };

  const getRatingColor = (stars: number) => {
    switch (stars) {
      case 1: return "#EF4444";
      case 2: return "#F59E0B";
      case 3: return "#6B7280";
      case 4: return "#10B981";
      case 5: return "#059669";
      default: return "#9CA3AF";
    }
  };

  const handleSaveNotes = (vendorId: string) => {
    updateVendorCheckIn(event.id, vendorId, { notes: tempNotes });
    setEditingNotes(null);
    setTempNotes("");
  };

  const handleAddPhoto = async (vendorId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        const updatedPhotos = [...vendor.eventPhotos, result.assets[0].uri];
        updateVendorCheckIn(event.id, vendorId, { eventPhotos: updatedPhotos });
      }
    }
  };

  const getVendorStatus = (vendor: VendorCheckIn) => {
    if (vendor.fundsReleased && vendor.review) return { text: 'Reviewed', color: '#10B981', bgColor: '#D1FAE5' };
    if (vendor.fundsReleased) return { text: 'Completed', color: '#10B981', bgColor: '#D1FAE5' };
    if (vendor.endConfirmed) return { text: 'Event Ended', color: '#F59E0B', bgColor: '#FEF3C7' };
    if (vendor.halfwayConfirmed) return { text: 'In Progress', color: '#3B82F6', bgColor: '#DBEAFE' };
    if (vendor.arrivalConfirmed) return { text: 'Checked In', color: '#8B5CF6', bgColor: '#EDE9FE' };
    return { text: 'Pending', color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const renderVendorCard = (vendor: VendorCheckIn) => {
    const status = getVendorStatus(vendor);
    const isEditingThisVendor = editingNotes === vendor.id;

    return (
      <View key={vendor.id} style={styles.vendorCard}>
        <TouchableOpacity
          activeOpacity={1}
          delayLongPress={400}
          onLongPress={() => {
            setQuickNoteVendorId(vendor.id);
            setQuickNoteText(vendor.notes ?? "");
            setShowQuickNoteModal(true);
          }}
        >
        <View style={styles.vendorHeader}>
          <View style={styles.vendorInfo}>
            <View style={styles.vendorAvatar}>
              <User size={20} color="#6366F1" />
            </View>
            <View style={styles.vendorDetails}>
              <Text style={styles.vendorName}>{vendor.vendorName}</Text>
              <View style={styles.tableLabelRow}>
                {editingTableLabel === vendor.id ? (
                  <View style={styles.tableLabelEditContainer}>
                    <TextInput
                      testID={`table-label-input-${vendor.id}`}
                      style={styles.tableLabelInput}
                      value={tempTableLabel}
                      onChangeText={setTempTableLabel}
                      placeholder="Table label (e.g., Table 12)"
                    />
                    <TouchableOpacity
                      testID={`table-label-save-${vendor.id}`}
                      style={styles.tableLabelSave}
                      onPress={() => {
                        updateVendorCheckIn(event.id, vendor.id, { tableLabel: tempTableLabel.trim() });
                        setEditingTableLabel(null);
                        setTempTableLabel("");
                      }}
                    >
                      <Save size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`table-label-cancel-${vendor.id}`}
                      style={styles.tableLabelCancel}
                      onPress={() => {
                        setEditingTableLabel(null);
                        setTempTableLabel("");
                      }}
                    >
                      <X size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.tableLabelDisplay}>
                    <Text style={styles.tableLabelText}>{vendor.tableLabel ?? 'Add table label'}</Text>
                    <TouchableOpacity
                      testID={`table-label-edit-${vendor.id}`}
                      onPress={() => {
                        setEditingTableLabel(vendor.id);
                        setTempTableLabel(vendor.tableLabel ?? "");
                      }}
                    >
                      <Edit3 size={14} color="#6366F1" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                <Text style={[styles.statusText, { color: status.color }]}> 
                  {status.text}
                </Text>
              </View>
            </View>
          </View>
          {vendor.eventPhotos.length > 0 && (
            <TouchableOpacity
              style={styles.photoCount}
              onPress={() => {
                setSelectedVendor(vendor.id);
                setShowPhotoModal(true);
              }}
            >
              <Camera size={16} color="#6366F1" />
              <Text style={styles.photoCountText}>{vendor.eventPhotos.length}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.checkInSection}>
          <Text style={styles.sectionTitle}>Check-in Progress</Text>
          
          <View style={styles.checkInRow}>
            <View style={styles.checkInInfo}>
              <Text style={styles.checkInLabel}>Arrival & ID Verification</Text>
              {vendor.arrivalTime && (
                <Text style={styles.checkInTime}>{vendor.arrivalTime}</Text>
              )}
            </View>
            {vendor.arrivalConfirmed ? (
              <View style={styles.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Awaiting Check-in</Text>
              </View>
            )}
          </View>

          <View style={styles.checkInRow}>
            <View style={styles.checkInInfo}>
              <Text style={styles.checkInLabel}>Halfway Check</Text>
              {vendor.halfwayCheckIn && (
                <Text style={styles.checkInTime}>{vendor.halfwayCheckIn}</Text>
              )}
            </View>
            {vendor.halfwayConfirmed ? (
              <View style={styles.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
              </View>
            ) : (
              <View style={[
                styles.pendingBadge,
                !vendor.arrivalConfirmed && styles.disabledPendingBadge,
              ]}>
                <Text style={[
                  styles.pendingText,
                  !vendor.arrivalConfirmed && styles.disabledPendingText,
                ]}>Awaiting Halfway</Text>
              </View>
            )}
          </View>

          <View style={styles.checkInRow}>
            <View style={styles.checkInInfo}>
              <Text style={styles.checkInLabel}>Event End</Text>
              {vendor.endCheckIn && (
                <Text style={styles.checkInTime}>{vendor.endCheckIn}</Text>
              )}
            </View>
            {vendor.endConfirmed ? (
              <View style={styles.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
              </View>
            ) : (
              <View style={[
                styles.pendingBadge,
                !vendor.halfwayConfirmed && styles.disabledPendingBadge,
              ]}>
                <Text style={[
                  styles.pendingText,
                  !vendor.halfwayConfirmed && styles.disabledPendingText,
                ]}>Awaiting End</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handleAddPhoto(vendor.id)}
            >
              <Camera size={16} color="#6366F1" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>

            {vendor.endConfirmed && !vendor.fundsReleased && (
              <TouchableOpacity
                style={styles.releaseButton}
                onPress={() => handleReleaseFunds(vendor.id)}
              >
                <DollarSign size={16} color="#FFFFFF" />
                <Text style={styles.releaseButtonText}>Release Funds</Text>
              </TouchableOpacity>
            )}

            {vendor.fundsReleased && !vendor.review && (
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => {
                  setReviewingVendor(vendor.id);
                  setShowReviewModal(true);
                }}
              >
                <MessageSquare size={16} color="#FFFFFF" />
                <Text style={styles.reviewButtonText}>Leave Review</Text>
              </TouchableOpacity>
            )}

            {vendor.stipendReleased && (
              <View style={styles.stipendReleasedBadge}>
                <DollarSign size={16} color="#065F46" />
                <Text style={styles.stipendReleasedText}>Stipend Released</Text>
              </View>
            )}

            {vendor.fundsReleased && vendor.review && (
              <View style={styles.releasedBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.releasedText}>Reviewed</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
            {!isEditingThisVendor && (
              <TouchableOpacity
                onPress={() => {
                  setEditingNotes(vendor.id);
                  setTempNotes(vendor.notes || "");
                }}
              >
                <Edit3 size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingThisVendor ? (
            <View style={styles.notesEditContainer}>
              <TextInput
                style={styles.notesInput}
                value={tempNotes}
                onChangeText={setTempNotes}
                placeholder="Add notes about this vendor..."
                multiline
                numberOfLines={3}
              />
              <View style={styles.notesActions}>
                <TouchableOpacity
                  style={styles.notesCancelButton}
                  onPress={() => {
                    setEditingNotes(null);
                    setTempNotes("");
                  }}
                >
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notesSaveButton}
                  onPress={() => handleSaveNotes(vendor.id)}
                >
                  <Save size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.notesText}>
              {vendor.notes || "No notes added yet"}
            </Text>
          )}
        </View>

        </TouchableOpacity>

        {vendor.review && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>Your Review</Text>
            <View style={styles.reviewContent}>
              <View style={styles.reviewHeader}>
                {renderStarRating(vendor.review.rating)}
                <Text style={styles.reviewRating}>{vendor.review.rating}/5</Text>
                <Text style={[styles.reviewStatus, { 
                  color: vendor.review.isRehirable ? "#10B981" : "#EF4444" 
                }]}>
                  {vendor.review.isRehirable ? "Rehirable" : "Not Rehirable"}
                </Text>
              </View>
              {vendor.review.comment && (
                <Text style={styles.reviewComment}>{vendor.review.comment}</Text>
              )}
              {vendor.review.hostResponse && (
                <View style={styles.hostResponseContainer}>
                  <Text style={styles.hostResponseLabel}>Host Response:</Text>
                  <Text style={styles.hostResponseText}>{vendor.review.hostResponse}</Text>
                </View>
              )}
              {vendor.review.tip > 0 && (
                <View style={styles.tipBadge}>
                  <DollarSign size={14} color="#10B981" />
                  <Text style={styles.tipText}>Tip: ${vendor.review.tip}</Text>
                </View>
              )}
              <Text style={styles.reviewDate}>
                Reviewed on {new Date(vendor.review.reviewDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Manage Vendors",
          headerStyle: { backgroundColor: "#10B981" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.header}
        >
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetails}>
              <View style={styles.eventDetail}>
                <MapPin size={14} color="#FFFFFF" />
                <Text style={styles.eventDetailText}>{event.location}</Text>
              </View>
              <View style={styles.eventDetail}>
                <Calendar size={14} color="#FFFFFF" />
                <Text style={styles.eventDetailText}>{event.date}</Text>
              </View>
            </View>
            {event.stipendReleaseMethod && (
              <View style={styles.headerStipendRow}>
                <View style={styles.headerStipendBadge}>
                  <DollarSign size={14} color="#065F46" />
                  <Text style={styles.headerStipendText}>
                    {event.stipendReleaseMethod === 'escrow' ? 'Stipend via Escrow' : event.stipendReleaseMethod === 'prepaid_cards' ? 'Prepaid Cards' : 'Notify Owner'}
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{vendors.length}</Text>
              <Text style={styles.statLabel}>Total Vendors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{completedVendors}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Stipend Mode</Text>
          </View>
          <View style={styles.stipendModesRow}>
            <TouchableOpacity
              testID="stipend-mode-notification"
              style={[styles.modeChip, stipendMode === 'notification' && styles.modeChipActive]}
              onPress={() => {
                setStipendMode('notification');
                updateEvent(event.id, { stipendReleaseMethod: 'notification' });
              }}
            >
              <Text style={[styles.modeChipText, stipendMode === 'notification' && styles.modeChipTextActive]}>Notify Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="stipend-mode-escrow"
              style={[styles.modeChip, stipendMode === 'escrow' && styles.modeChipActive]}
              onPress={() => {
                setStipendMode('escrow');
                updateEvent(event.id, { stipendReleaseMethod: 'escrow', escrowEnabled: true });
              }}
            >
              <Text style={[styles.modeChipText, stipendMode === 'escrow' && styles.modeChipTextActive]}>Escrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="stipend-mode-prepaid"
              style={[styles.modeChip, stipendMode === 'prepaid_cards' && styles.modeChipActive]}
              onPress={() => {
                setStipendMode('prepaid_cards');
                updateEvent(event.id, { stipendReleaseMethod: 'prepaid_cards' });
              }}
            >
              <Text style={[styles.modeChipText, stipendMode === 'prepaid_cards' && styles.modeChipTextActive]}>Prepaid Cards</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoInline}>
            <AlertCircle size={14} color="#1E40AF" />
            <Text style={styles.infoInlineText}>Select how stipends are released to contractors for this event.</Text>
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Vendor Management</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddVendor(true)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Vendor</Text>
            </TouchableOpacity>
          </View>

          {vendors.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Vendors Added</Text>
              <Text style={styles.emptyStateText}>
                Add vendors to start tracking their check-ins and manage payments.
              </Text>
            </View>
          ) : (
            vendors.map(renderVendorCard)
          )}
        </View>

        <Modal
          visible={showAddVendor}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddVendor(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Vendor</Text>
              <TextInput
                style={styles.modalInput}
                value={newVendorName}
                onChangeText={setNewVendorName}
                placeholder="Enter vendor name"
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowAddVendor(false);
                    setNewVendorName("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalAddButton}
                  onPress={handleAddVendor}
                >
                  <Text style={styles.modalAddText}>Add Vendor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPhotoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalOverlay}>
            <View style={styles.photoModalContent}>
              <View style={styles.photoModalHeader}>
                <Text style={styles.photoModalTitle}>Event Photos</Text>
                <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.photoGrid}>
                {selectedVendor && vendors.find(v => v.id === selectedVendor)?.eventPhotos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.eventPhoto} />
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showReviewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reviewModalContent}>
              <View style={styles.reviewModalHeader}>
                <Text style={styles.reviewModalTitle}>Review Contractor</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {reviewingVendor && (
                <View style={styles.reviewForm}>
                  <Text style={styles.vendorNameReview}>
                    {vendors.find(v => v.id === reviewingVendor)?.vendorName}
                  </Text>
                  
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>How would you rate their performance?</Text>
                    {renderStarRating(reviewRating, setReviewRating)}
                    <Text style={[styles.ratingText, { color: getRatingColor(reviewRating) }]}>
                      {getRatingText(reviewRating)}
                    </Text>
                  </View>

                  {reviewRating === 1 && (
                    <View style={styles.responseSection}>
                      <Text style={styles.responseLabel}>Required Response</Text>
                      <Text style={styles.responseSubtext}>
                        Please explain why this contractor is not rehirable:
                      </Text>
                      <TextInput
                        style={styles.responseInput}
                        placeholder="e.g., Left table unmanned, did not hand out materials, unprofessional behavior..."
                        value={hostResponse}
                        onChangeText={setHostResponse}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                  
                  <View style={styles.commentSection}>
                    <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
                    <TextInput
                      style={styles.commentInput}
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      placeholder="Share additional feedback about this contractor's performance..."
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                  
                  <View style={styles.tipSection}>
                    <Text style={styles.tipLabel}>Tip Amount (Optional)</Text>
                    <View style={styles.tipInputContainer}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.tipInput}
                        value={tipAmount}
                        onChangeText={setTipAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {reviewRating === 1 && (
                    <View style={styles.warningCard}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={styles.warningText}>
                        This contractor will be marked as &quot;Not Rehirable&quot; and may be restricted from future events.
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.reviewModalActions}>
                    <TouchableOpacity
                      style={styles.reviewCancelButton}
                      onPress={() => {
                        setShowReviewModal(false);
                        setReviewRating(0);
                        setReviewComment("");
                        setTipAmount("0");
                        setHostResponse("");
                      }}
                    >
                      <Text style={styles.reviewCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reviewSubmitButton}
                      onPress={handleSubmitReview}
                    >
                      <Text style={styles.reviewSubmitText}>Submit Review</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>

      <Modal
        visible={showQuickNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickNoteContent}>
            <View style={styles.quickNoteHeader}>
              <Text style={styles.quickNoteTitle}>Private Note</Text>
              <TouchableOpacity onPress={() => setShowQuickNoteModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.quickNoteSub}>Visible to owner and considered during ratings</Text>
            <TextInput
              testID={quickNoteVendorId ? `quick-note-input-${quickNoteVendorId}` : 'quick-note-input'}
              style={styles.quickNoteInput}
              value={quickNoteText}
              onChangeText={setQuickNoteText}
              placeholder="Type a private note..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.quickNoteActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowQuickNoteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={quickNoteVendorId ? `quick-note-save-${quickNoteVendorId}` : 'quick-note-save'}
                style={styles.modalAddButton}
                onPress={() => {
                  if (quickNoteVendorId) {
                    updateVendorCheckIn(event.id, quickNoteVendorId, { notes: quickNoteText.trim() });
                  }
                  setShowQuickNoteModal(false);
                }}
              >
                <Text style={styles.modalAddText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  eventInfo: {
    marginBottom: 20,
  },
  headerStipendRow: {
    marginTop: 10,
    flexDirection: "row",
  },
  headerStipendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  headerStipendText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: "row",
    gap: 16,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventDetailText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  content: {
    padding: 20,
  },
  stipendModesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modeChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  modeChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: "#FFFFFF",
  },
  infoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 16,
  },
  infoInlineText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  vendorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  vendorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    backgroundColor: "#EDE9FE",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vendorDetails: {
    flex: 1,
  },
  tableLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  tableLabelDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableLabelText: {
    fontSize: 12,
    color: "#6B7280",
  },
  tableLabelEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableLabelInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 160,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  tableLabelSave: {
    backgroundColor: "#10B981",
    padding: 8,
    borderRadius: 6,
  },
  tableLabelCancel: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 6,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  photoCount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  checkInSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  checkInRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checkInInfo: {
    flex: 1,
  },
  checkInLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 2,
  },
  checkInTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  checkInButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkInButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#F3F4F6",
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
  completedBadge: {
    backgroundColor: "#D1FAE5",
    padding: 6,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  disabledPendingBadge: {
    backgroundColor: "#F3F4F6",
  },
  disabledPendingText: {
    color: "#9CA3AF",
  },
  actionSection: {
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  photoButtonText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
  },
  releaseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  releaseButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  releasedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  releasedText: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "600",
  },
  stipendReleasedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  stipendReleasedText: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "600",
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  notesText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  notesEditContainer: {
    gap: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },
  notesActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  notesCancelButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  notesSaveButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  quickNoteContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 420,
  },
  quickNoteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  quickNoteTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickNoteSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  quickNoteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  quickNoteActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalAddButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  modalAddText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  photoGrid: {
    flex: 1,
  },
  eventPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  reviewButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 12,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  reviewContent: {
    gap: 8,
  },
  starContainer: {
    flexDirection: "row",
    gap: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  tipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  tipText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  reviewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  reviewForm: {
    gap: 20,
  },
  vendorNameReview: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    gap: 12,
  },
  ratingLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  commentSection: {
    gap: 8,
  },
  commentLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 80,
  },
  tipSection: {
    gap: 8,
  },
  tipLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  tipInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  dollarSign: {
    fontSize: 16,
    color: "#6B7280",
    marginRight: 4,
  },
  tipInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#111827",
  },
  reviewModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  reviewCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  reviewCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  reviewSubmitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  reviewSubmitText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 50,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  reviewRating: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  reviewStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: "auto",
  },
  hostResponseContainer: {
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  hostResponseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 2,
  },
  hostResponseText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  responseSection: {
    gap: 8,
  },
  responseLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  responseSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },
});