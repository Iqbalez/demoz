export const USSD_MESSAGES = {
  welcome: `CON ወደ Demoz HR እንኳን ደህና መጡ\nWelcome to Demoz HR\n\nPIN ያስገቡ / Enter PIN:`,
  
  invalidPin: `END PIN ትክክል አይደለም። ድጋሚ ይደውሉ።\nInvalid PIN. Please redial.`,
  
  clockInPrompt: `CON ሰላም {name}!\n1. ስራ ጀምር / Clock In\n2. ስራ ጨርስ / Clock Out\n0. ሰርዝ / Cancel`,
  
  clockInSuccess: `END ✓ ስራ ጀምሯል {time}\nClock-in recorded at {time}`,
  
  clockOutSuccess: `END ✓ ስራ ጨርሷል {time}\nClock-out recorded at {time}`,
  
  alreadyClockedIn: `END ቀድሞ ተመዝግቧል {time}\nAlready clocked in at {time}. To clock out choose 2.`,
  
  duplicateRecord: `END ቀድሞ ተመዝግቧል ዛሬ። / Already recorded today. No duplicate logged.`,
  
  sessionExpired: `END ጊዜ አልፏል። ድጋሚ ይደውሉ።\nSession expired. Please redial.`,
  
  serviceUnavailable: `END አገልግሎቱ ለጊዜው አይገኝም። ድጋሚ ይደውሉ።\nService temporarily unavailable. Please redial.`,
  
  cancelled: `END ተሰርዟል / Cancelled`,
  
  invalidOption: `CON ያልተፈቀደ ምርጫ / Invalid option\n1. ስራ ጀምር / Clock In\n2. ስራ ጨርስ / Clock Out\n0. ሰርዝ / Cancel`,
  
  unregistered: `END Your phone number is not registered on Demoz. Please contact HR.`,
  
  suspended: `END System error: Service suspended for this business.`,
};

export function formatMessage(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(`{${key}}`, val),
    template
  );
}
