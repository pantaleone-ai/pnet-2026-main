import { ChannelType } from "../types";
import { ChannelAdapter } from "./types";
import { websiteAdapter, linkedinAdapter, emailAdapter } from "./real";
import {
  xAdapter,
  instagramAdapter,
  facebookAdapter,
  youtubeAdapter,
} from "./scaffold";

export * from "./types";

export function adapterFor(channel: ChannelType): ChannelAdapter {
  switch (channel) {
    case "website":
      return websiteAdapter();
    case "linkedin":
      return linkedinAdapter();
    case "email":
      return emailAdapter();
    case "x":
      return xAdapter();
    case "instagram":
      return instagramAdapter();
    case "facebook":
      return facebookAdapter();
    case "youtube":
      return youtubeAdapter();
  }
}

export function channelStatuses(): Array<{
  channel: ChannelType;
  connected: boolean;
  supports: ReturnType<ChannelAdapter["capabilities"]>;
}> {
  const all: ChannelType[] = [
    "website",
    "linkedin",
    "email",
    "x",
    "instagram",
    "facebook",
    "youtube",
  ];
  return all.map((c) => {
    const a = adapterFor(c);
    return { channel: c, connected: a.connected(), supports: a.capabilities() };
  });
}
