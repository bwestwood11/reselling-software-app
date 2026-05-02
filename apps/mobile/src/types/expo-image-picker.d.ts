declare module "expo-image-picker" {
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export interface MediaLibraryPermissionResponse {
    status: "granted" | "denied" | "undetermined";
    granted: boolean;
    canAskAgain: boolean;
    expires: string;
  }

  export interface ImagePickerOptions {
    mediaTypes?: string[] | MediaType;
    allowsMultipleSelection?: boolean;
    quality?: number;
    selectionLimit?: number;
    allowsEditing?: boolean;
    aspect?: [number, number];
  }

  export type MediaType = "images" | "videos" | "livePhotos";

  export function requestMediaLibraryPermissionsAsync(): Promise<MediaLibraryPermissionResponse>;
  export function requestCameraPermissionsAsync(): Promise<MediaLibraryPermissionResponse>;
  export function launchImageLibraryAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>;
  export function launchCameraAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>;
}
