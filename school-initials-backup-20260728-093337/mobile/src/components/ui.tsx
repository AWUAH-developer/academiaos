import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.titleWrap}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Button({ title, loading, variant = 'primary', disabled, ...props }: PressableProps & { title: string; loading?: boolean; variant?: 'primary'|'secondary'|'danger'; }) {
  return <Pressable {...props} disabled={disabled || loading} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.buttonSecondary, variant === 'danger' && styles.buttonDanger, (pressed || disabled || loading) && styles.buttonPressed]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.navy : '#fff'} /> : <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.inputMultiline]} placeholderTextColor="#8290A5" autoCapitalize={props.autoCapitalize ?? 'none'} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}
export function EmptyState({ title, message }: { title: string; message: string }) { return <Card style={styles.center}><Text style={styles.emptyIcon}>◎</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.subtitle}>{message}</Text></Card>; }
export function LoadingState({ label = 'Loading…' }: { label?: string }) { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.green} /><Text style={styles.subtitle}>{label}</Text></View>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <Card style={styles.center}><Text style={styles.errorTitle}>Could not load</Text><Text style={styles.subtitle}>{message}</Text>{onRetry ? <Button title="Try again" onPress={onRetry} variant="secondary" /> : null}</Card>; }
export function Avatar({ uri, name, size = 52, square = false }: { uri?: string | null; name: string; size?: number; square?: boolean }) {
  const initials = name.split(/\s+/).slice(0,2).map((part) => part[0]?.toUpperCase()).join('');
  return uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: square ? radius.md : size/2, backgroundColor: colors.border }} /> : <View style={[styles.avatar, { width: size, height: size, borderRadius: square ? radius.md : size/2 }]}><Text style={[styles.avatarText, { fontSize: size * .34 }]}>{initials || 'A'}</Text></View>;
}
export function Badge({ text, tone = 'info' }: { text: string; tone?: 'info'|'success'|'warning'|'danger' }) {
  const map = { info: [colors.infoSoft, colors.info], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger] } as const;
  return <View style={[styles.badge, { backgroundColor: map[tone][0] }]}><Text style={[styles.badgeText, { color: map[tone][1] }]}>{text}</Text></View>;
}
export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) { return <Card style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text>{hint ? <Text style={styles.metricHint}>{hint}</Text> : null}</Card>; }

const styles = StyleSheet.create({
  titleWrap:{gap:4,marginBottom:spacing.lg}, title:{fontSize:27,fontWeight:'800',color:colors.navy}, subtitle:{fontSize:14,lineHeight:21,color:colors.muted},
  card:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,padding:spacing.lg,gap:spacing.md,shadowColor:'#000',shadowOpacity:.04,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:1},
  button:{minHeight:50,borderRadius:radius.md,backgroundColor:colors.green,alignItems:'center',justifyContent:'center',paddingHorizontal:spacing.lg}, buttonSecondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.navy}, buttonDanger:{backgroundColor:colors.danger}, buttonPressed:{opacity:.65}, buttonText:{color:'#fff',fontSize:16,fontWeight:'800'},buttonTextSecondary:{color:colors.navy},
  field:{gap:6},label:{fontSize:13,fontWeight:'700',color:colors.text},input:{minHeight:50,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:14,fontSize:16,color:colors.text,backgroundColor:'#FAFCFF'},inputMultiline:{minHeight:100,paddingTop:14,textAlignVertical:'top'},error:{color:colors.danger,fontSize:12},
  center:{alignItems:'center',textAlign:'center'},emptyIcon:{fontSize:34,color:colors.green},emptyTitle:{fontSize:18,fontWeight:'800',color:colors.navy},loading:{flex:1,minHeight:240,alignItems:'center',justifyContent:'center',gap:12},errorTitle:{fontSize:18,fontWeight:'800',color:colors.danger},
  avatar:{backgroundColor:colors.navySoft,alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'800'},badge:{alignSelf:'flex-start',borderRadius:radius.pill,paddingHorizontal:10,paddingVertical:5},badgeText:{fontSize:11,fontWeight:'800',textTransform:'capitalize'},
  metric:{flex:1,minWidth:145},metricValue:{fontSize:23,fontWeight:'900',color:colors.navy},metricLabel:{fontSize:13,fontWeight:'700',color:colors.muted},metricHint:{fontSize:11,color:colors.muted}
});
