interface VoiceListRes {
    voices: string[];
}

interface LLMProvidersRes {
    textLLMProviders: string[];
    imageLLMProviders: string[];
}

interface VideoGenerateReq {
    text_llm_provider?: string; // Text LLM provider
    image_llm_provider?: string; // Image LLM provider
    text_llm_model?: string; // Text LLM model
    image_llm_model?: string; // Image LLM model
    test_mode?: boolean; // 是否为测试模式
    task_id?: string; // 任务ID，测试模式才需要
    segments: number; // 分段数量 (1-10)
    language?: Language; // 故事语言
    story_prompt?: string; // 故事提示词，测试模式不需要，非测试模式必填
    image_style?: string; // 图片风格，测试模式不需要，非测试模式必填
    voice_name: string; // 语音名称，需要和语言匹配
    voice_rate: number; // 语音速率，默认写1
    // Add account_id and user_id for credit deduction
    account_id: string;
    user_id: string; 
}

// 假设 Language 和 ImageStyle 是其他接口或枚举
type Language = "zh-CN" | "zh-TW" |  "en-US" | "ja-JP" | "ko-KR" | "bn-IN" | "bn-BD";

interface VideoGenerateRes {
    success: boolean;
    data?: {
        task_id: string; // task_id is returned immediately
        video_url?: string; // 视频 URL (available later)
    };
    message: string | null;
}

// Account Management Interfaces
export type AccountType = "personal" | "team";

export interface ITeamMember {
    user_id: string;
    email: string;
    role: string;
    joined_at: string; // ISO date string
    invitation_status: "pending" | "accepted" | "rejected";
    invitation_id?: string;
}

export interface IAccount {
    id: string;
    name: string;
    type: AccountType;
    credits: number;
    description?: string;
    created_at: string; // ISO date string
    is_owner: boolean;
    owner_id: string; 
    members: ITeamMember[];
}

export interface ICreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
    description?: string;
}

export interface ITransaction {
    id: string;
    account_id: string;
    user_id?: string; // User who initiated or was involved
    type: "purchase" | "deduction" | "refund" | "adjustment";
    amount: number; // Number of credits
    description: string;
    timestamp: string; // ISO date string
    payment_id?: string; // Link to PayPal payment if applicable
    video_info?: string; // Info about video if deduction
}

export interface IPaymentExecutionResponse {
  payment_id: string;
  status: "completed" | "pending" | "failed" | string; // string to allow for other statuses
  redirect_url?: string | null;
  error_message?: string | null;
}