import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/auth-store";

export type UserRole = 'business_owner' | 'contractor' | 'event_host' | 'guest' | null;

export interface BusinessOwner {
  id: string;
  name: string;
  email: string;
  businessName: string;
  phone: string;
  website?: string;
  businessType?: 'sole_proprietor' | 'llc' | 'partnership' | 'corporation' | 's_corp' | 'non_profit';
  einTin?: string;
  createdAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  idVerified: boolean;
  documentsCompleted: boolean;
  trainingCompleted: boolean;
  availableForWork: boolean;
  rating: number;
  completedJobs: number;
  skills: string[];
  location: string;
  reliableTransportation: boolean;
  agreedToTermsAt?: string;
  createdAt: string;
  oneStarCount?: number;
  suspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  resumeUri?: string;
  resumeName?: string;
  resumeMimeType?: string;
  resumeSize?: number;
}

export interface EventHost {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  phone: string;
  website?: string;
  location: string;
  eventsHosted: number;
  rating: number;
  acceptsDeliverables?: boolean;
  deliveryAddress?: string;
  createdAt: string;
}

export interface TrainingDocument {
  id: string;
  title: string;
  type: 'video' | 'document' | 'pdf' | 'video_link' | 'video_upload';
  url: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  questions?: QuizQuestion[];
  businessOwnerId?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ContractorTrainingProgress {
  contractorId: string;
  trainingId: string;
  attempts: number;
  completed: boolean;
  completedAt?: string;
  scores: number[];
}

const USER_STORAGE_KEY = "user_data";
const CONTRACTORS_STORAGE_KEY = "contractors_data";
const BUSINESS_OWNERS_STORAGE_KEY = "business_owners_data";
const EVENT_HOSTS_STORAGE_KEY = "event_hosts_data";
const TRAINING_MATERIALS_STORAGE_KEY = "training_materials_data";
const TRAINING_PROGRESS_STORAGE_KEY = "training_progress_data";

const mockContractors: Contractor[] = [
  {
    id: "c1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "1995-03-15",
    idVerified: true,
    documentsCompleted: true,
    trainingCompleted: true,
    availableForWork: true,
    rating: 4.8,
    completedJobs: 23,
    skills: ["Customer Service", "Event Setup", "Product Demo"],
    location: "CA",
    reliableTransportation: true,
    agreedToTermsAt: "2024-01-10T09:00:00Z",
    createdAt: "2024-01-15T10:00:00Z",
    oneStarCount: 0,
    suspended: false,
  },
  {
    id: "c2",
    name: "Mike Chen",
    email: "mike.chen@email.com",
    phone: "+1 (555) 234-5678",
    dateOfBirth: "1992-07-22",
    idVerified: true,
    documentsCompleted: true,
    trainingCompleted: false,
    availableForWork: false,
    rating: 4.6,
    completedJobs: 18,
    skills: ["Sales", "Tech Support", "Crowd Management"],
    location: "CA",
    reliableTransportation: false,
    agreedToTermsAt: "2024-01-20T12:00:00Z",
    createdAt: "2024-02-01T14:30:00Z",
    oneStarCount: 0,
    suspended: false,
  },
];

const mockEventHosts: EventHost[] = [
  {
    id: "eh1",
    name: "Downtown Events Co.",
    email: "contact@downtownevents.com",
    organizationName: "Downtown Events Co.",
    phone: "+1 (555) 987-6543",
    website: "https://downtownevents.com",
    location: "Oakland, CA",
    eventsHosted: 12,
    rating: 4.7,
    acceptsDeliverables: true,
    deliveryAddress: "123 Downtown Plaza, Oakland, CA 94612",
    createdAt: "2024-01-05T08:00:00Z",
  },
  {
    id: "eh3",
    name: "Seattle Events Group",
    email: "info@seattleevents.org",
    organizationName: "Seattle Events Group",
    phone: "+1 (206) 555-0123",
    location: "Seattle, WA",
    eventsHosted: 8,
    rating: 4.5,
    acceptsDeliverables: true,
    deliveryAddress: "456 Pike Place Market, Seattle, WA 98101",
    createdAt: "2024-02-10T10:30:00Z",
  },
];

const mockTrainingDocuments: TrainingDocument[] = [
  {
    id: "t1",
    title: "Customer Service Excellence",
    type: "video",
    url: "https://example.com/training/customer-service",
    required: true,
    completed: false,
  },
  {
    id: "t2",
    title: "Event Safety Guidelines",
    type: "document",
    url: "https://example.com/docs/safety-guidelines.pdf",
    required: true,
    completed: false,
  },
  {
    id: "t3",
    title: "Product Demonstration Techniques",
    type: "video",
    url: "https://example.com/training/product-demo",
    required: false,
    completed: false,
  },
];

export const [UserProvider, useUser] = createContextHook(() => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<BusinessOwner | Contractor | EventHost | null>(null);
  const { user: authUser } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>(mockContractors);
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [eventHosts, setEventHosts] = useState<EventHost[]>(mockEventHosts);
  const [trainingDocuments, setTrainingDocuments] = useState<TrainingDocument[]>(mockTrainingDocuments);
  const [trainingMaterials, setTrainingMaterials] = useState<TrainingDocument[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<ContractorTrainingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (authUser) {
      if (userRole !== authUser.role) {
        setUserRole(authUser.role as UserRole);
      }
      if (!currentUser && authUser.role !== 'guest') {
        const now = new Date().toISOString();
        if (authUser.role === 'business_owner') {
          const minimal: BusinessOwner = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            businessName: '',
            phone: '',
            createdAt: now,
          };
          setCurrentUser(minimal);
          saveUserData('business_owner', minimal);
        } else if (authUser.role === 'contractor') {
          const minimal: Contractor = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            phone: '',
            dateOfBirth: '',
            idVerified: false,
            documentsCompleted: false,
            trainingCompleted: false,
            availableForWork: false,
            rating: 0,
            completedJobs: 0,
            skills: [],
            location: '',
            reliableTransportation: false,
            createdAt: now,
            oneStarCount: 0,
            suspended: false,
          };
          setCurrentUser(minimal);
          saveUserData('contractor', minimal);
        } else if (authUser.role === 'event_host') {
          const minimal: EventHost = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            organizationName: '',
            phone: '',
            location: '',
            eventsHosted: 0,
            rating: 0,
            createdAt: now,
          };
          setCurrentUser(minimal);
          saveUserData('event_host', minimal);
        }
      } else if (authUser.role === 'guest') {
        // For guest users, we don't create a currentUser profile
        // They can only access limited public information
        setCurrentUser(null);
      }
    } else {
      setUserRole(null);
      setCurrentUser(null);
    }
  }, [authUser]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const contractorsData = await AsyncStorage.getItem(CONTRACTORS_STORAGE_KEY);
      const businessOwnersData = await AsyncStorage.getItem(BUSINESS_OWNERS_STORAGE_KEY);
      const eventHostsData = await AsyncStorage.getItem(EVENT_HOSTS_STORAGE_KEY);
      const trainingMaterialsData = await AsyncStorage.getItem(TRAINING_MATERIALS_STORAGE_KEY);
      const trainingProgressData = await AsyncStorage.getItem(TRAINING_PROGRESS_STORAGE_KEY);

      if (userData) {
        const parsed = JSON.parse(userData);
        setUserRole(parsed.role);
        setCurrentUser(parsed.user);
      }

      if (contractorsData) {
        const parsed = JSON.parse(contractorsData);
        setContractors([...mockContractors, ...parsed]);
      }

      if (businessOwnersData) {
        const parsed = JSON.parse(businessOwnersData);
        setBusinessOwners(parsed);
      }

      if (eventHostsData) {
        const parsed = JSON.parse(eventHostsData);
        setEventHosts([...mockEventHosts, ...parsed]);
      }

      if (trainingMaterialsData) {
        const parsed = JSON.parse(trainingMaterialsData);
        setTrainingMaterials(parsed);
      }

      if (trainingProgressData) {
        const parsed = JSON.parse(trainingProgressData);
        setTrainingProgress(parsed);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserData = async (role: UserRole, user: BusinessOwner | Contractor | EventHost | null) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ role, user }));
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  };

  const loginAsBusinessOwner = useCallback((businessOwner: BusinessOwner) => {
    setUserRole('business_owner');
    setCurrentUser(businessOwner);
    saveUserData('business_owner', businessOwner);
  }, []);

  const loginAsContractor = useCallback((contractor: Contractor) => {
    setUserRole('contractor');
    setCurrentUser(contractor);
    saveUserData('contractor', contractor);
  }, []);

  const loginAsEventHost = useCallback((eventHost: EventHost) => {
    setUserRole('event_host');
    setCurrentUser(eventHost);
    saveUserData('event_host', eventHost);
  }, []);

  const logout = useCallback(async () => {
    setUserRole(null);
    setCurrentUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const updateBusinessOwner = useCallback(async (id: string, data: Partial<BusinessOwner>) => {
    const updatedBusinessOwners = businessOwners.map(bo => 
      bo.id === id ? { ...bo, ...data } : bo
    );
    setBusinessOwners(updatedBusinessOwners);
    
    if (currentUser && currentUser.id === id) {
      const updatedUser = { ...currentUser, ...data } as BusinessOwner;
      setCurrentUser(updatedUser);
      saveUserData(userRole, updatedUser);
    }
    
    try {
      const customBusinessOwners = updatedBusinessOwners.filter(bo => !mockContractors.find(mc => mc.id === bo.id));
      await AsyncStorage.setItem(BUSINESS_OWNERS_STORAGE_KEY, JSON.stringify(customBusinessOwners));
    } catch (error) {
      console.error("Error updating business owner:", error);
    }
  }, [businessOwners, currentUser, userRole]);

  const updateContractor = useCallback(async (id: string, data: Partial<Contractor>) => {
    const updatedContractors = contractors.map(c => 
      c.id === id ? { ...c, ...data } : c
    );
    setContractors(updatedContractors);
    
    if (currentUser && currentUser.id === id) {
      const updatedUser = { ...currentUser, ...data } as Contractor;
      setCurrentUser(updatedUser);
      saveUserData(userRole, updatedUser);
    }
    
    try {
      const customContractors = updatedContractors.filter(c => !mockContractors.find(mc => mc.id === c.id));
      await AsyncStorage.setItem(CONTRACTORS_STORAGE_KEY, JSON.stringify(customContractors));
    } catch (error) {
      console.error("Error updating contractor:", error);
    }
  }, [contractors, currentUser, userRole]);

  const updateEventHost = useCallback(async (id: string, data: Partial<EventHost>) => {
    const updatedEventHosts = eventHosts.map(eh => 
      eh.id === id ? { ...eh, ...data } : eh
    );
    setEventHosts(updatedEventHosts);
    
    if (currentUser && currentUser.id === id) {
      const updatedUser = { ...currentUser, ...data } as EventHost;
      setCurrentUser(updatedUser);
      saveUserData(userRole, updatedUser);
    }
    
    try {
      await AsyncStorage.setItem(EVENT_HOSTS_STORAGE_KEY, JSON.stringify(updatedEventHosts));
    } catch (error) {
      console.error("Error updating event host:", error);
    }
  }, [eventHosts, currentUser, userRole]);

  const registerBusinessOwner = useCallback(async (data: Omit<BusinessOwner, 'id' | 'createdAt'>) => {
    const newBusinessOwner: BusinessOwner = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    const updatedBusinessOwners = [...businessOwners, newBusinessOwner];
    setBusinessOwners(updatedBusinessOwners);
    
    try {
      await AsyncStorage.setItem(BUSINESS_OWNERS_STORAGE_KEY, JSON.stringify(updatedBusinessOwners.filter(bo => !mockContractors.find(mc => mc.id === bo.id))));
    } catch (error) {
      console.error("Error saving business owner:", error);
    }
    
    loginAsBusinessOwner(newBusinessOwner);
    return newBusinessOwner;
  }, [businessOwners, loginAsBusinessOwner]);

  const registerContractor = useCallback(async (data: Omit<Contractor, 'id' | 'createdAt' | 'rating' | 'completedJobs' | 'idVerified' | 'documentsCompleted' | 'trainingCompleted' | 'availableForWork' | 'agreedToTermsAt'>) => {
    const newContractor: Contractor = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      rating: 0,
      completedJobs: 0,
      idVerified: false,
      documentsCompleted: false,
      trainingCompleted: false,
      availableForWork: false,
      agreedToTermsAt: new Date().toISOString(),
      oneStarCount: 0,
      suspended: false,
    };
    
    const updatedContractors = [...contractors, newContractor];
    setContractors(updatedContractors);
    
    try {
      const customContractors = updatedContractors.filter(c => !mockContractors.find(mc => mc.id === c.id));
      await AsyncStorage.setItem(CONTRACTORS_STORAGE_KEY, JSON.stringify(customContractors));
    } catch (error) {
      console.error("Error saving contractor:", error);
    }
    
    loginAsContractor(newContractor);
    return newContractor;
  }, [contractors, loginAsContractor]);

  const registerEventHost = useCallback(async (data: Omit<EventHost, 'id' | 'createdAt' | 'eventsHosted' | 'rating'>) => {
    const newEventHost: EventHost = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      eventsHosted: 0,
      rating: 0,
    };
    
    const updatedEventHosts = [...eventHosts, newEventHost];
    setEventHosts(updatedEventHosts);
    
    try {
      await AsyncStorage.setItem(EVENT_HOSTS_STORAGE_KEY, JSON.stringify(updatedEventHosts));
    } catch (error) {
      console.error("Error saving event host:", error);
    }
    
    loginAsEventHost(newEventHost);
    return newEventHost;
  }, [eventHosts, loginAsEventHost]);

  const updateContractorTraining = useCallback((contractorId: string, documentId: string) => {
    setTrainingDocuments(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, completed: true, completedAt: new Date().toISOString() }
          : doc
      )
    );

    const allRequired = trainingDocuments.filter(doc => doc.required);
    const completedRequired = allRequired.filter(doc => doc.completed || doc.id === documentId);
    
    if (completedRequired.length === allRequired.length) {
      setContractors(prev => 
        prev.map(contractor => 
          contractor.id === contractorId 
            ? { ...contractor, trainingCompleted: true, availableForWork: true }
            : contractor
        )
      );
    }
  }, [trainingDocuments]);

  const createTrainingMaterial = useCallback(async (material: Omit<TrainingDocument, 'id' | 'completed' | 'completedAt'>) => {
    const newMaterial: TrainingDocument = {
      ...material,
      id: Date.now().toString(),
      completed: false,
      businessOwnerId: currentUser?.id,
    };
    
    const updatedMaterials = [...trainingMaterials, newMaterial];
    setTrainingMaterials(updatedMaterials);
    
    try {
      await AsyncStorage.setItem(TRAINING_MATERIALS_STORAGE_KEY, JSON.stringify(updatedMaterials));
    } catch (error) {
      console.error("Error saving training material:", error);
    }
    
    return newMaterial;
  }, [trainingMaterials, currentUser]);

  const updateTrainingMaterial = useCallback(async (materialId: string, updates: Partial<TrainingDocument>) => {
    const updatedMaterials = trainingMaterials.map(material => 
      material.id === materialId ? { ...material, ...updates } : material
    );
    setTrainingMaterials(updatedMaterials);
    
    try {
      await AsyncStorage.setItem(TRAINING_MATERIALS_STORAGE_KEY, JSON.stringify(updatedMaterials));
    } catch (error) {
      console.error("Error updating training material:", error);
    }
  }, [trainingMaterials]);

  const deleteTrainingMaterial = useCallback(async (materialId: string) => {
    const updatedMaterials = trainingMaterials.filter(material => material.id !== materialId);
    setTrainingMaterials(updatedMaterials);
    
    const updatedProgress = trainingProgress.filter(progress => progress.trainingId !== materialId);
    setTrainingProgress(updatedProgress);
    
    try {
      await AsyncStorage.setItem(TRAINING_MATERIALS_STORAGE_KEY, JSON.stringify(updatedMaterials));
      await AsyncStorage.setItem(TRAINING_PROGRESS_STORAGE_KEY, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error("Error deleting training material:", error);
    }
  }, [trainingMaterials, trainingProgress]);

  const submitQuizAttempt = useCallback(async (contractorId: string, trainingId: string, score: number) => {
    const existingProgress = trainingProgress.find(p => p.contractorId === contractorId && p.trainingId === trainingId);
    
    if (existingProgress) {
      if (existingProgress.attempts >= 3) {
        throw new Error('Maximum attempts reached');
      }
      
      const updatedProgress: ContractorTrainingProgress = {
        ...existingProgress,
        attempts: existingProgress.attempts + 1,
        scores: [...existingProgress.scores, score],
        completed: score === 5,
        completedAt: score === 5 ? new Date().toISOString() : existingProgress.completedAt,
      };
      
      setTrainingProgress(prev => prev.map(p => 
        p.contractorId === contractorId && p.trainingId === trainingId ? updatedProgress : p
      ));
      
      if (score === 5) {
        const allRequiredMaterials = trainingMaterials.filter(m => m.required);
        const contractorProgress = trainingProgress.filter(p => p.contractorId === contractorId);
        const completedRequired = contractorProgress.filter(p => p.completed && allRequiredMaterials.some(m => m.id === p.trainingId));
        
        if (completedRequired.length + 1 >= allRequiredMaterials.length) {
          setContractors(prev => prev.map(c => 
            c.id === contractorId ? { ...c, trainingCompleted: true, availableForWork: true } : c
          ));
        }
      }
    } else {
      const newProgress: ContractorTrainingProgress = {
        contractorId,
        trainingId,
        attempts: 1,
        scores: [score],
        completed: score === 5,
        completedAt: score === 5 ? new Date().toISOString() : undefined,
      };
      
      setTrainingProgress(prev => [...prev, newProgress]);
      
      if (score === 5) {
        const allRequiredMaterials = trainingMaterials.filter(m => m.required);
        const contractorProgress = trainingProgress.filter(p => p.contractorId === contractorId);
        const completedRequired = contractorProgress.filter(p => p.completed && allRequiredMaterials.some(m => m.id === p.trainingId));
        
        if (completedRequired.length + 1 >= allRequiredMaterials.length) {
          setContractors(prev => prev.map(c => 
            c.id === contractorId ? { ...c, trainingCompleted: true, availableForWork: true } : c
          ));
        }
      }
    }
    
    try {
      await AsyncStorage.setItem(TRAINING_PROGRESS_STORAGE_KEY, JSON.stringify(trainingProgress));
    } catch (error) {
      console.error("Error saving training progress:", error);
    }
  }, [trainingProgress, trainingMaterials]);

  return useMemo(() => ({
    userRole,
    currentUser,
    contractors,
    businessOwners,
    eventHosts,
    trainingDocuments,
    trainingMaterials,
    trainingProgress,
    isLoading,
    loginAsBusinessOwner,
    loginAsContractor,
    loginAsEventHost,
    logout,
    registerBusinessOwner,
    registerContractor,
    registerEventHost,
    updateBusinessOwner,
    updateContractor,
    updateEventHost,
    updateContractorTraining,
    createTrainingMaterial,
    updateTrainingMaterial,
    deleteTrainingMaterial,
    submitQuizAttempt,
  }), [
    userRole,
    currentUser,
    contractors,
    businessOwners,
    eventHosts,
    trainingDocuments,
    trainingMaterials,
    trainingProgress,
    isLoading,
    loginAsBusinessOwner,
    loginAsContractor,
    loginAsEventHost,
    logout,
    registerBusinessOwner,
    registerContractor,
    registerEventHost,
    updateBusinessOwner,
    updateContractor,
    updateEventHost,
    updateContractorTraining,
    createTrainingMaterial,
    updateTrainingMaterial,
    deleteTrainingMaterial,
    submitQuizAttempt,
  ]);
});