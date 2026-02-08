import type { Component } from "vue";
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  UserGroupIcon,
} from "@heroicons/vue/24/outline";

export const getTypeIcon = (type: string): Component => {
  const icons: Record<string, Component> = {
    email: EnvelopeIcon,
    text: ChatBubbleLeftIcon,
    phone_call: PhoneIcon,
    in_person_visit: UserGroupIcon,
    virtual_meeting: VideoCameraIcon,
    camp: UserGroupIcon,
    showcase: UserGroupIcon,
    game: UserGroupIcon,
    unofficial_visit: UserGroupIcon,
    official_visit: UserGroupIcon,
    other: ChatBubbleLeftIcon,
    tweet: ChatBubbleLeftIcon,
    dm: ChatBubbleLeftIcon,
  };
  return icons[type] || ChatBubbleLeftIcon;
};

export const getTypeIconBg = (type: string): string => {
  const bgs: Record<string, string> = {
    email: "bg-blue-100",
    text: "bg-green-100",
    phone_call: "bg-purple-100",
    in_person_visit: "bg-amber-100",
    virtual_meeting: "bg-indigo-100",
    camp: "bg-orange-100",
    showcase: "bg-pink-100",
    game: "bg-red-100",
    unofficial_visit: "bg-teal-100",
    official_visit: "bg-cyan-100",
    other: "bg-gray-100",
    tweet: "bg-sky-100",
    dm: "bg-violet-100",
  };
  return bgs[type] || "bg-slate-100";
};

export const getTypeIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    email: "text-blue-600",
    text: "text-green-600",
    phone_call: "text-purple-600",
    in_person_visit: "text-amber-600",
    virtual_meeting: "text-indigo-600",
    camp: "text-orange-600",
    showcase: "text-pink-600",
    game: "text-red-600",
    unofficial_visit: "text-teal-600",
    official_visit: "text-cyan-600",
    other: "text-gray-600",
    tweet: "text-sky-600",
    dm: "text-violet-600",
  };
  return colors[type] || "text-slate-600";
};

export const formatType = (type: string): string => {
  const typeMap: Record<string, string> = {
    email: "Email",
    text: "Text",
    phone_call: "Phone Call",
    in_person_visit: "In-Person Visit",
    virtual_meeting: "Virtual Meeting",
    camp: "Camp",
    showcase: "Showcase",
    game: "Game",
    unofficial_visit: "Unofficial Visit",
    official_visit: "Official Visit",
    other: "Other",
    tweet: "Tweet",
    dm: "Direct Message",
  };
  return typeMap[type] || type;
};

export const formatSentiment = (sentiment: string): string => {
  const sentimentMap: Record<string, string> = {
    very_positive: "Very Positive",
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
  };
  return sentimentMap[sentiment] || sentiment;
};

export const getSentimentBadgeClass = (sentiment: string): string => {
  const classes: Record<string, string> = {
    very_positive: "bg-emerald-100 text-emerald-700",
    positive: "bg-blue-100 text-blue-700",
    neutral: "bg-slate-100 text-slate-700",
    negative: "bg-red-100 text-red-700",
  };
  return classes[sentiment] || "bg-slate-100 text-slate-700";
};
