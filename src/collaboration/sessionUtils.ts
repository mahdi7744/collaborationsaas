// src/collaboration/sessionUtils.ts

import { DailyCall } from "@daily-co/daily-js";

// Join a room
export const joinRoom = async (callObject: DailyCall, roomUrl: string) => {
  try {
    await callObject.join({ url: roomUrl });
    console.log("Joined room successfully");
  } catch (error) {
    console.error("Failed to join room", error);
  }
};

// Start screen share
export const startScreenShare = (callObject: DailyCall) => {
  callObject.startScreenShare();
  console.log("Started screen share");
};

// Stop screen share
export const stopScreenShare = (callObject: DailyCall) => {
  callObject.stopScreenShare();
  console.log("Stopped screen share");
};

// Leave room
export const leaveRoom = (callObject: DailyCall) => {
  callObject.leave();
  console.log("Left the room");
};
