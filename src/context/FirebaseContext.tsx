import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseEnabled } from '../services/firebase';

// Interfaces
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
}

export interface Client {
  id: string;
  brandName: string;
  projectTitle: string;
  budget: number;
  status: 'In Review' | 'In Progress' | 'Completed';
  tasks: Task[];
  email: string;
  invoiceNumberPrefix: string;
  lastInvoiceNumber: number;
}

export interface Profile {
  brandName: string;
  email: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  address: string;
}

export interface InvoiceRecord {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  pdfUrl?: string;
}

interface FirebaseContextType {
  isFirebase: boolean;
  user: User | null;
  loading: boolean;
  clients: Client[];
  profile: Profile;
  invoices: InvoiceRecord[];
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  addClient: (c: Omit<Client, 'id'>) => Promise<string>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  rolloverClientTasks: (clientId: string) => Promise<void>;
  addInvoice: (invoice: Omit<InvoiceRecord, 'id'>, pdfBlob?: Blob) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Default Seed Data
const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'demo-1',
    brandName: 'Aether Design Labs',
    projectTitle: 'Brand Identity & Web Assets',
    budget: 4800,
    status: 'In Progress',
    email: 'billing@aetherlabs.co',
    invoiceNumberPrefix: 'AE-',
    lastInvoiceNumber: 104,
    tasks: [
      { id: 't1', text: 'Finalize design tokens and typography hierarchy', completed: true, dueDate: '2026-05-20' },
      { id: 't2', text: 'Design high-fidelity desktop UI layout mockups', completed: false, dueDate: '2026-05-21' },
      { id: 't3', text: 'Create responsive tablet and mobile views', completed: false, dueDate: '2026-05-22' },
    ]
  },
  {
    id: 'demo-2',
    brandName: 'Helios Launchpad',
    projectTitle: 'SaaS Dashboard Integration',
    budget: 9500,
    status: 'In Review',
    email: 'accounts@helioslaunch.io',
    invoiceNumberPrefix: 'HL-',
    lastInvoiceNumber: 21,
    tasks: [
      { id: 't4', text: 'Review database indexes and API latency', completed: true, dueDate: '2026-05-19' },
      { id: 't5', text: 'Address QA issues with mobile menu navigation', completed: true, dueDate: '2026-05-20' },
    ]
  },
  {
    id: 'demo-3',
    brandName: 'Stellar Flow',
    projectTitle: 'E-Commerce Marketing Site',
    budget: 3200,
    status: 'Completed',
    email: 'hello@stellarflow.xyz',
    invoiceNumberPrefix: 'SF-',
    lastInvoiceNumber: 8,
    tasks: [
      { id: 't6', text: 'Deploy to Vercel production hosting environment', completed: true, dueDate: '2026-05-18' },
    ]
  }
];

const DEFAULT_PROFILE: Profile = {
  brandName: 'Nexus Design Group',
  email: 'hello@nexusdesign.co',
  bankName: 'Silicon Valley Trust',
  accountNumber: '•••• •••• 9283',
  routingNumber: '021000021',
  swiftCode: 'SVTRUS33XXX',
  address: '100 Pine Street, San Francisco, CA 94111'
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  // 1. Setup Auth listener
  useEffect(() => {
    if (isFirebaseEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(!firebaseUser); // Wait for document data if logged in
        if (!firebaseUser) {
          // If not logged in, reset states
          setClients([]);
          setInvoices([]);
          setProfile(DEFAULT_PROFILE);
          setLoading(false);
        }
      });
      return unsubscribe;
    } else {
      // Local mode
      const savedClients = localStorage.getItem('apex_clients');
      const savedProfile = localStorage.getItem('apex_profile');
      const savedInvoices = localStorage.getItem('apex_invoices');

      if (savedClients) setClients(JSON.parse(savedClients));
      else {
        setClients(DEFAULT_CLIENTS);
        localStorage.setItem('apex_clients', JSON.stringify(DEFAULT_CLIENTS));
      }

      if (savedProfile) setProfile(JSON.parse(savedProfile));
      else {
        setProfile(DEFAULT_PROFILE);
        localStorage.setItem('apex_profile', JSON.stringify(DEFAULT_PROFILE));
      }

      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
      else {
        setInvoices([]);
      }

      setLoading(false);
    }
  }, []);

  // 2. Fetch User Firestore Data when logged in
  useEffect(() => {
    if (isFirebaseEnabled && db && user) {
      setLoading(true);

      // Listen to profile changes
      const profileRef = doc(db, 'users', user.uid);
      const unsubProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as Profile);
        } else {
          // Seed initial profile in Firestore
          setDoc(profileRef, DEFAULT_PROFILE);
          setProfile(DEFAULT_PROFILE);
        }
      });

      // Listen to clients
      const clientsRef = collection(db, 'users', user.uid, 'clients');
      const unsubClients = onSnapshot(clientsRef, (snapshot) => {
        const clientsList: Client[] = [];
        snapshot.forEach((docSnap) => {
          clientsList.push({ id: docSnap.id, ...docSnap.data() } as Client);
        });
        setClients(clientsList);
      });

      // Listen to invoices
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const unsubInvoices = onSnapshot(invoicesRef, (snapshot) => {
        const invoicesList: InvoiceRecord[] = [];
        snapshot.forEach((docSnap) => {
          invoicesList.push({ id: docSnap.id, ...docSnap.data() } as InvoiceRecord);
        });
        setInvoices(invoicesList);
        setLoading(false);
      });

      return () => {
        unsubProfile();
        unsubClients();
        unsubInvoices();
      };
    }
  }, [user]);

  // Auth Operations
  const login = async (e: string, p: string) => {
    if (isFirebaseEnabled && auth) {
      await signInWithEmailAndPassword(auth, e, p);
    }
  };

  const register = async (e: string, p: string) => {
    if (isFirebaseEnabled && auth) {
      await createUserWithEmailAndPassword(auth, e, p);
    }
  };

  const logout = async () => {
    if (isFirebaseEnabled && auth) {
      await signOut(auth);
    }
  };

  // Profile operations
  const saveProfile = async (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    if (isFirebaseEnabled && db && user) {
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
    } else {
      localStorage.setItem('apex_profile', JSON.stringify(updatedProfile));
    }
  };

  // Clients CRUD
  const addClient = async (newClient: Omit<Client, 'id'>): Promise<string> => {
    const tempId = Math.random().toString(36).substring(2, 9);
    if (isFirebaseEnabled && db && user) {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'clients'), newClient);
      return docRef.id;
    } else {
      const updated = [...clients, { ...newClient, id: tempId }];
      setClients(updated);
      localStorage.setItem('apex_clients', JSON.stringify(updated));
      return tempId;
    }
  };

  const updateClient = async (updatedClient: Client) => {
    // Update local state directly to reflect changes immediately
    const updated = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updated);

    if (isFirebaseEnabled && db && user) {
      const clientRef = doc(db, 'users', user.uid, 'clients', updatedClient.id);
      await setDoc(clientRef, updatedClient);
    } else {
      localStorage.setItem('apex_clients', JSON.stringify(updated));
    }
  };

  const deleteClient = async (clientId: string) => {
    const updated = clients.filter(c => c.id !== clientId);
    setClients(updated);

    if (isFirebaseEnabled && db && user) {
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
    } else {
      localStorage.setItem('apex_clients', JSON.stringify(updated));
    }
  };

  // Rollover Client Tasks
  const rolloverClientTasks = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Filter out completed tasks and move unfinished tasks to next business day
    const activeTasks = client.tasks.filter(t => !t.completed);
    
    // Calculate next business day (skipping weekends)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // 0 = Sunday, 6 = Saturday
    if (tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 2); // Move to Monday
    } else if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1); // Move to Monday
    }
    
    const nextBusinessDayString = tomorrow.toISOString().split('T')[0];

    const rolledTasks: Task[] = activeTasks.map(t => ({
      ...t,
      dueDate: nextBusinessDayString
    }));

    const updatedClient: Client = {
      ...client,
      tasks: rolledTasks
    };

    await updateClient(updatedClient);
  };

  // Invoice logs
  const addInvoice = async (invoice: Omit<InvoiceRecord, 'id'>, pdfBlob?: Blob) => {
    let pdfUrl = '';

    if (isFirebaseEnabled && db && storage && user && pdfBlob) {
      try {
        // Upload invoice PDF to Firebase Storage
        const storagePath = `users/${user.uid}/invoices/${invoice.invoiceNumber}.pdf`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, pdfBlob);
        pdfUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Failed to upload PDF to Storage, adding record without file link:", err);
      }
    }

    const tempId = Math.random().toString(36).substring(2, 9);
    const invoiceRecord: InvoiceRecord = {
      ...invoice,
      id: tempId,
      pdfUrl: pdfUrl || undefined
    };

    if (isFirebaseEnabled && db && user) {
      // Save record in firestore
      const invoiceRef = collection(db, 'users', user.uid, 'invoices');
      await addDoc(invoiceRef, invoiceRecord);
    } else {
      // Save local
      const updated = [invoiceRecord, ...invoices];
      setInvoices(updated);
      localStorage.setItem('apex_invoices', JSON.stringify(updated));
    }

    // Increment client's last invoice number
    const client = clients.find(c => c.id === invoice.clientId);
    if (client) {
      const updatedClient = {
        ...client,
        lastInvoiceNumber: client.lastInvoiceNumber + 1
      };
      await updateClient(updatedClient);
    }
  };

  return (
    <FirebaseContext.Provider value={{
      isFirebase: isFirebaseEnabled,
      user,
      loading,
      clients,
      profile,
      invoices,
      login,
      register,
      logout,
      saveProfile,
      addClient,
      updateClient,
      deleteClient,
      rolloverClientTasks,
      addInvoice
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
