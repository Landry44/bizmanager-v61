import crypto from "node:crypto";

export type PaymentRequest={orderId:string;amount:number;currency:string;plan:string;companyId:string};

export interface PaymentProviderAdapter {
  createCheckout(input:PaymentRequest):Promise<{externalId:string;checkoutUrl?:string}>;
  verifyWebhook(rawBody:string,signature:string):boolean;
}

// Generic adapter: safe default for development/manual payment flows.
// A real provider should implement this interface and verify signatures with its official secret.
export const genericProvider:PaymentProviderAdapter={
  async createCheckout(input){
    return {externalId:`manual_${input.orderId}`};
  },
  verifyWebhook(rawBody,signature){
    const secret=process.env.PAYMENT_WEBHOOK_SECRET;
    if(!secret || !signature)return false;
    const expected=crypto.createHmac("sha256",secret).update(rawBody).digest("hex");
    try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature));}catch{return false;}
  }
};
