import { useState, useEffect, useRef } from 'react';
import { Upload, Volume2, Bell, PlayCircle, Smartphone, MonitorSpeaker } from 'lucide-react';
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    notificationEnabled,
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
    requestNotificationPermission,
    notifyNewOrder,
    notifyCancelled,
    notifyPaymentFailed,
    isAudioInitialized,
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

  const handleSaveSettings = async () => {
    try {
      await updateSpeakerSettings({
        notificationEnabled,
        speakerEnabled,
        speakerVolume,
        speakerNewOrderText: newOrderText,
        speakerCancelledText: cancelledText,
        speakerPaymentFailedText: paymentFailedText,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存失败，请重试');
    }
  };

  const handleTestNewOrder = () => {
    notifyNewOrder('ORDTEST001', 6800, 3);
  };

  const handleTestCancelled = () => {
    notifyCancelled('ORDTEST002');
  };

  const handleTestPaymentFailed = () => {
    notifyPaymentFailed('ORDTEST003');
  };

  return (
    <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-0 sm:py-0">
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

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex-shrink-0">
              {paymentQR ? (
                <img
                  src={paymentQR}
                  alt="收款二维码"
                  className="h-40 w-40 rounded-xl border-2 border-primary/20 object-contain sm:h-48 sm:w-48"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-border sm:h-48 sm:w-48">
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
                className="w-full sm:w-auto"
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

      {/* 提醒与播报设置（合并版） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSpeaker className="h-5 w-5 text-primary" />
            提醒与播报设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 通知开关 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label>系统通知提醒</Label>
                <p className="text-sm text-muted-foreground">
                  后台运行时也能收到新订单通知
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={notificationEnabled ? 'outline' : 'default'}
              onClick={requestNotificationPermission}
              disabled={notificationEnabled}
              className="flex-shrink-0"
            >
              {notificationEnabled ? '已开启' : '开启通知'}
            </Button>
          </div>

          {/* 语音播报开关 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-primary" />
              <div>
                <Label>语音播报</Label>
                <p className="text-sm text-muted-foreground">
                  新订单、取消订单、支付失败时语音提醒
                </p>
              </div>
            </div>
            <Switch checked={speakerEnabled} onCheckedChange={setSpeakerEnabled} />
          </div>

          {speakerEnabled && (
            <>
              {/* 音量调节 */}
              <div className="space-y-3 rounded-xl bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">播报音量</Label>
                  <span className="text-sm font-medium text-foreground">{speakerVolume}%</span>
                </div>
                <Slider
                  value={[speakerVolume]}
                  onValueChange={([value]) => setSpeakerVolume(value)}
                  max={100}
                  min={10}
                  step={5}
                />
              </div>

              {/* 播报文案设置 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">播报内容</Label>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newOrderText" className="text-sm">
                      新订单播报
                    </Label>
                    <Input
                      id="newOrderText"
                      value={newOrderText}
                      onChange={(e) => setNewOrderText(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cancelledText" className="text-sm">
                      取消订单播报
                    </Label>
                    <Input
                      id="cancelledText"
                      value={cancelledText}
                      onChange={(e) => setCancelledText(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="paymentFailedText" className="text-sm">
                      支付失败播报
                    </Label>
                    <Input
                      id="paymentFailedText"
                      value={paymentFailedText}
                      onChange={(e) => setPaymentFailedText(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 测试按钮 */}
              <div className="space-y-3">
                <Label className="text-sm">测试播报</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestNewOrder}
                    className="text-xs"
                  >
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                    新订单
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestCancelled}
                    className="text-xs"
                  >
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                    取消订单
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestPaymentFailed}
                    className="text-xs"
                  >
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                    支付失败
                  </Button>
                </div>
              </div>

              {/* 保存按钮 */}
              <Button onClick={handleSaveSettings} className="w-full">
                {saveSuccess ? '✓ 保存成功' : '保存设置'}
              </Button>
            </>
          )}

          {/* 移动端使用提示 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex gap-3">
              <Smartphone className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  手机端使用提示
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <li>• 首次使用请点击页面任意位置激活语音播报</li>
                  <li>• 建议将页面添加到主屏幕，保持后台运行</li>
                  <li>• 开启系统通知后，锁屏也能收到提醒</li>
                  {!isAudioInitialized && (
                    <li className="text-amber-600 dark:text-amber-500 font-medium">
                      ⚠️ 点击页面任意位置激活语音功能
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
