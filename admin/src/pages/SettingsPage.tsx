import { useState, useEffect, useRef } from 'react';
import { Upload, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { Slider } from '../components/ui/Slider';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getPaymentQR, uploadPaymentQR, updateSpeakerSettings } from '../lib/api';
import { useSpeaker } from '../hooks/useSpeaker';

export default function SettingsPage() {
  const [paymentQR, setPaymentQR] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    speakerEnabled,
    setSpeakerEnabled,
    speakerVolume,
    setSpeakerVolume,
    newOrderText,
    setNewOrderText,
    paymentFailedText,
    setPaymentFailedText,
  } = useSpeaker();

  useEffect(() => {
    async function fetchQR() {
      try {
        const data = await getPaymentQR();
        setPaymentQR(data.paymentQR);
      } catch (error) {
        console.error('Failed to fetch payment QR:', error);
      }
    }
    fetchQR();
  }, []);

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadPaymentQR(file);
      setPaymentQR(data.paymentQR);
    } catch (error) {
      console.error('Failed to upload QR:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSpeakerSettings = async () => {
    try {
      await updateSpeakerSettings({
        speakerEnabled,
        speakerVolume,
        speakerNewOrderText: newOrderText,
        speakerPaymentFailedText: paymentFailedText,
      });
      alert('保存成功');
    } catch (error) {
      console.error('Failed to save speaker settings:', error);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* Payment QR */}
      <Card>
        <CardHeader>
          <CardTitle>收款二维码</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            上传您的微信收款二维码，顾客下单时将显示此二维码供扫描支付
          </p>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {paymentQR ? (
                <img
                  src={paymentQR}
                  alt="收款二维码"
                  className="h-48 w-48 rounded-xl border-2 border-primary/20 object-contain"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <Upload className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">未设置</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadQR}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? '上传中...' : '上传二维码'}
              </Button>
              <p className="text-xs text-muted-foreground">
                支持 JPG、PNG、GIF 格式，建议尺寸 200x200 像素
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Settings */}
      <Card>
        <CardHeader>
          <CardTitle>语音播报设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {speakerEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label>启用语音播报</Label>
                <p className="text-sm text-muted-foreground">有新订单或支付失败时自动播报</p>
              </div>
            </div>
            <Switch checked={speakerEnabled} onCheckedChange={setSpeakerEnabled} />
          </div>

          {speakerEnabled && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>播报音量</Label>
                  <span className="text-sm text-muted-foreground">{speakerVolume}%</span>
                </div>
                <Slider
                  value={[speakerVolume]}
                  onValueChange={([value]) => setSpeakerVolume(value)}
                  max={100}
                  min={10}
                  step={10}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newOrderText">新订单播报文字</Label>
                  <Input
                    id="newOrderText"
                    value={newOrderText}
                    onChange={(e) => setNewOrderText(e.target.value)}
                    placeholder="例如：新订单来了"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentFailedText">支付失败播报文字</Label>
                  <Input
                    id="paymentFailedText"
                    value={paymentFailedText}
                    onChange={(e) => setPaymentFailedText(e.target.value)}
                    placeholder="例如：客户支付失败"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSpeakerSettings} className="w-full">
                保存语音设置
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
