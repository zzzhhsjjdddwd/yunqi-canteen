import { useState, useCallback, useEffect, useRef } from 'react';
import { getSpeakerSettings } from '../lib/api';

export function useSpeaker() {
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [newOrderText, setNewOrderText] = useState('新订单来了');
  const [paymentFailedText, setPaymentFailedText] = useState('客户支付失败');

  // Use ref to store text values to avoid dependency chain
  const textRef = useRef({ newOrderText, paymentFailedText });
  useEffect(() => {
    textRef.current = { newOrderText, paymentFailedText };
  }, [newOrderText, paymentFailedText]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSpeakerSettings();
        setSpeakerEnabled(settings.speakerEnabled);
        setSpeakerVolume(settings.speakerVolume);
        setNewOrderText(settings.speakerNewOrderText);
        setPaymentFailedText(settings.speakerPaymentFailedText);
      } catch (error) {
        console.error('Failed to load speaker settings:', error);
      }
    }
    loadSettings();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!speakerEnabled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.volume = speakerVolume / 100;
      utterance.rate = 1;
      utterance.pitch = 1;

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    },
    [speakerEnabled, speakerVolume]
  );

  // Use ref to store stable function references
  const speakNewOrderRef = useRef(() => {
    speak(textRef.current.newOrderText);
  });
  const speakPaymentFailedRef = useRef(() => {
    speak(textRef.current.paymentFailedText);
  });

  // Update refs when speak changes
  useEffect(() => {
    speakNewOrderRef.current = () => {
      speak(textRef.current.newOrderText);
    };
  }, [speak]);

  useEffect(() => {
    speakPaymentFailedRef.current = () => {
      speak(textRef.current.paymentFailedText);
    };
  }, [speak]);

  return {
    speakerEnabled,
    setSpeakerEnabled,
    speakerVolume,
    setSpeakerVolume,
    newOrderText,
    setNewOrderText,
    paymentFailedText,
    setPaymentFailedText,
    // Return refs' current function to avoid dependency instability
    speakNewOrder: () => speakNewOrderRef.current(),
    speakPaymentFailed: () => speakPaymentFailedRef.current(),
  };
}
