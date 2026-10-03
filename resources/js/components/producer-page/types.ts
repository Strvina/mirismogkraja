import { type Producer } from '@/types';

/** The producer as their public page receives it: no owner, status or phone number. */
export type PublicProducer = Omit<Producer, 'user_id' | 'status' | 'created_at' | 'updated_at' | 'phone'> & { has_phone: boolean };
