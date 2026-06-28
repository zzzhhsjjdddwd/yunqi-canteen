import { useState, useCallback, useEffect, useRef } from 'react';
import { getSpeakerSettings } from '../lib/api';

export function useSpeaker() {
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [newOrderText, setNewOrderText] = useState('新订单来了');
  const [cancelledText, setCancelledText] = useState('客户取消订单');
  const [paymentFailedText, setPaymentFailedText] = useState('客户支付失败');
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  const isLoadedFromServerRef = useRef(false);
  const textRef = useRef({ newOrderText, cancelledText, paymentFailedText });

  useEffect(() => {
    textRef.current = { newOrderText, cancelledText, paymentFailedText };
  }, [newOrderText, cancelledText, paymentFailedText]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSpeakerSettings();
        setNotificationEnabled(settings.notificationEnabled ?? true);
        setSpeakerEnabled(settings.speakerEnabled ?? true);
        setSpeakerVolume(settings.speakerVolume ?? 80);
        setNewOrderText(settings.speakerNewOrderText ?? '新订单来了');
        setCancelledText(settings.speakerCancelledText ?? '客户取消订单');
        setPaymentFailedText(settings.speakerPaymentFailedText ?? '客户支付失败');
        isLoadedFromServerRef.current = true;
      } catch (error) {
        console.error('Failed to load speaker settings:', error);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  const initAudio = useCallback(() => {
    if (isAudioInitialized) return;
    setIsAudioInitialized(true);

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      try {
        const ctx = new AudioContext();
        ctx.resume();
      } catch (e) {
        console.warn('AudioContext init failed:', e);
      }
    }

    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        utterance.lang = 'zh-CN';
        speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis init failed:', e);
      }
    }
  }, [isAudioInitialized]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('keydown', handleFirstInteraction, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [initAudio]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setNotificationEnabled(true);
      return true;
    }
    if (Notification.permission === 'denied') return false;
    try {
      initAudio();
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationEnabled(granted);
      return granted;
    } catch {
      return false;
    }
  }, [initAudio]);

  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!notificationEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: tag || 'notification',
        requireInteraction: true,
      } as NotificationOptions);
    } catch (error) {
      console.error('Notification error:', error);
    }
  }, [notificationEnabled]);

  const playDingSound = useCallback(() => {
    if (!speakerEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const volume = Math.max(0.01, Math.min(1, (speakerVolume || 80) / 100 * 0.6));
      if (!isFinite(volume)) return;

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.24);
      oscillator.frequency.setValueAtTime(1568, ctx.currentTime + 0.36);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.7);
    } catch (error) {
      console.error('Play ding sound error:', error);
    }
  }, [speakerEnabled, speakerVolume]);

  const speak = useCallback(
    (text: string) => {
      if (!speakerEnabled) return;
      if (!('speechSynthesis' in window)) return;

      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.volume = speakerVolume / 100;
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(
          (v) => v.lang.includes('zh') || v.lang.includes('CN')
        );
        if (chineseVoice) {
          utterance.voice = chineseVoice;
        }

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Speak error:', error);
      }
    },
    [speakerEnabled, speakerVolume]
  );

  const speakNewOrderRef = useRef(() => {
    speak(textRef.current.newOrderText);
  });
  const speakCancelledRef = useRef(() => {
    speak(textRef.current.cancelledText);
  });
  const speakPaymentFailedRef = useRef(() => {
    speak(textRef.current.paymentFailedText);
  });

  useEffect(() => {
    speakNewOrderRef.current = () => {
      speak(textRef.current.newOrderText);
    };
    speakCancelledRef.current = () => {
      speak(textRef.current.cancelledText);
    };
    speakPaymentFailedRef.current = () => {
      speak(textRef.current.paymentFailedText);
    };
  }, [speak]);

  const notifyNewOrder = useCallback(
    (orderNo: string, total: number, itemCount: number) => {
      initAudio();
      playDingSound();

      setTimeout(() => {
        speakNewOrderRef.current();
      }, 700);

      const amount = (total / 100).toFixed(2);
      showNotification(
        '新订单来了',
        `订单号：${orderNo}\n共 ${itemCount} 件商品\n金额：¥${amount}`,
        `order-${orderNo}`
      );
    },
    [initAudio, playDingSound, showNotification]
  );

  const notifyCancelled = useCallback(
    (orderNo: string) => {
      initAudio();
      playDingSound();

      setTimeout(() => {
        speakCancelledRef.current();
      }, 700);

      showNotification(
        '订单取消',
        `订单号：${orderNo} 已被客户取消`,
        `cancel-${orderNo}`
      );
    },
    [initAudio, playDingSound, showNotification]
  );

  const notifyPaymentFailed = useCallback(
    (orderNo: string) => {
      initAudio();
      speakPaymentFailedRef.current();
      showNotification(
        '支付失败',
        `订单号：${orderNo} 支付失败，请及时处理`,
        `payment-failed-${orderNo}`
      );
    },
    [initAudio, showNotification]
  );

  return {
    notificationEnabled,
    setNotificationEnabled,
    speakerEnabled,
    setSpeakerEnabled,
    speakerVolume,
    setSpeakerVolume,
    newOrderText,
    setNewOrderText,
    cancelledText,
    setCancelledText,
    paymentFailedText,
    setPaymentFailedText,
    isAudioInitialized,
    requestNotificationPermission,
    initAudio,
    speakNewOrder: () => speakNewOrderRef.current(),
    speakCancelled: () => speakCancelledRef.current(),
    speakPaymentFailed: () => speakPaymentFailedRef.current(),
    notifyNewOrder,
    notifyCancelled,
    notifyPaymentFailed,
    playDingSound,
  };
}
