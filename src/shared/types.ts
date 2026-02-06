export interface CodeData {
    id: string;
    code: string;
    rewards: string;
    expiry?: string;
}

export interface ApiResponse {
    newestCode: CodeData;
}

export interface ExtensionMessage {
    type: 'NEW_GIFT';
    data: CodeData;
}

export const STORAGE_KEYS = {
    LAST_ID: 'lastId',
    REDEEMED_LIST: 'redeemed_list'
} as const;
