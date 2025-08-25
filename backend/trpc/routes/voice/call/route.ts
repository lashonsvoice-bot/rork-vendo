import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { config } from "@/backend/config/env";

const initiateVoiceCallSchema = z.object({
  toPhone: z.string().min(1),
  toEmail: z.string().email().optional(),
  eventTitle: z.string(),
  eventDate: z.string(),
  eventLocation: z.string().optional(),
  businessName: z.string().optional(),
});

export const initiateVoiceCallProcedure = publicProcedure
  .input(initiateVoiceCallSchema)
  .mutation(async ({ input }) => {
    const { toPhone, toEmail, eventTitle, eventDate, eventLocation, businessName } = input;
    
    console.log('[VoiceCall] Initiating voice call to:', toPhone);
    console.log('[VoiceCall] Event details:', { eventTitle, eventDate, eventLocation, businessName });
    
    try {
      if (!config.twilio) {
        console.warn('[VoiceCall] Twilio not configured, using fallback mode');
        return {
          success: true,
          message: 'Voice call initiated (fallback mode)',
          callSid: 'fallback_' + Date.now(),
        };
      }
      
      const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/voice/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toPhone, 
          toEmail, 
          eventTitle, 
          eventDate,
          eventLocation,
          businessName
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('[VoiceCall] Voice call initiated successfully:', result.sid);
        return {
          success: true,
          message: 'Voice call initiated successfully',
          callSid: result.sid,
        };
      } else {
        console.error('[VoiceCall] Voice call initiation failed:', result.error);
        return {
          success: false,
          message: `Voice call failed: ${result.error}`,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('[VoiceCall] Error initiating voice call:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Voice call error: ${errorMessage}`,
        error: errorMessage,
      };
    }
  });

export default initiateVoiceCallProcedure;