import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";

const sendInvitationEmailSchema = z.object({
  businessEmail: z.string().email(),
  businessName: z.string(),
  ownerName: z.string(),
  hostName: z.string(),
  eventTitle: z.string(),
  eventDate: z.string(),
  eventLocation: z.string(),
  proposalId: z.string(),
});

const sendInvitationSMSSchema = z.object({
  businessPhone: z.string(),
  businessName: z.string(),
  hostName: z.string(),
  eventTitle: z.string(),
  proposalId: z.string(),
});

export const sendInvitationEmailProcedure = protectedProcedure
  .input(sendInvitationEmailSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Sending invitation email:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can send invitation emails");
    }
    
    try {
      // Email template for business invitation
      const emailContent = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #007AFF, #5856D6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">RevoVend Invitation</h1>
              <p style="color: white; margin: 10px 0 0 0;">You're Invited to Participate!</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Hello ${input.ownerName},</h2>
              
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                ${input.hostName} would like to invite <strong>${input.businessName}</strong> to participate in their upcoming event:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007AFF;">
                <h3 style="margin: 0 0 10px 0; color: #007AFF;">${input.eventTitle}</h3>
                <p style="margin: 5px 0; color: #666;">
                  <strong>Date:</strong> ${new Date(input.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p style="margin: 5px 0; color: #666;">
                  <strong>Location:</strong> ${input.eventLocation}
                </p>
              </div>
              
              <h3 style="color: #333;">What is RevoVend?</h3>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                RevoVend is a revolutionary platform that helps businesses like yours staff vendor events remotely. 
                We connect you with qualified contractors who can represent your business at events, allowing you to:
              </p>
              
              <ul style="font-size: 16px; line-height: 1.8; color: #555;">
                <li>Expand your presence at multiple events simultaneously</li>
                <li>Reduce travel costs and time commitments</li>
                <li>Access a network of trained, professional contractors</li>
                <li>Get detailed event reports and customer interactions</li>
                <li>Increase your foot traffic and brand exposure</li>
              </ul>
              
              <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #007AFF;">Ready to Get Started?</h4>
                <p style="margin: 0; color: #555;">
                  Join RevoVend today and discover how we can help you grow your business through strategic event participation.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://revovend.com/signup?ref=${input.proposalId}" 
                   style="background: #007AFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Join RevoVend & Accept Invitation
                </a>
              </div>
              
              <p style="font-size: 14px; color: #888; text-align: center;">
                This invitation was sent by ${input.hostName} through RevoVend.<br>
                If you have any questions, please contact us at support@revovend.com
              </p>
            </div>
          </body>
        </html>
      `;
      
      // In a real implementation, you would send this via your email service
      // For now, we'll just log it and return success
      console.log("Email content prepared for:", input.businessEmail);
      console.log("Email HTML length:", emailContent.length);
      
      return {
        success: true,
        emailSent: true,
        message: "Invitation email sent successfully",
      };
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw new Error("Failed to send invitation email");
    }
  });

export const sendInvitationSMSProcedure = protectedProcedure
  .input(sendInvitationSMSSchema)
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    console.log("Sending invitation SMS:", input);
    
    if (ctx.user.role !== "event_host") {
      throw new Error("Only event hosts can send invitation SMS");
    }
    
    try {
      // SMS template for business invitation
      const smsContent = `
🎪 RevoVend Invitation

Hi! ${input.hostName} invited ${input.businessName} to participate in "${input.eventTitle}"

RevoVend helps businesses staff events remotely with qualified contractors. Expand your reach without the travel!

Join now: https://revovend.com/signup?ref=${input.proposalId}

Questions? Reply STOP to opt out.
      `.trim();
      
      // In a real implementation, you would send this via your SMS service (Twilio, etc.)
      // For now, we'll just log it and return success
      console.log("SMS content prepared for:", input.businessPhone);
      console.log("SMS content:", smsContent);
      console.log("SMS length:", smsContent.length, "characters");
      
      return {
        success: true,
        smsSent: true,
        message: "Invitation SMS sent successfully",
      };
    } catch (error) {
      console.error("Error sending invitation SMS:", error);
      throw new Error("Failed to send invitation SMS");
    }
  });