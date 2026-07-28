import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { Badge, Card, EmptyState, ErrorState, LoadingState, ScreenTitle } from '@/components/ui';
import { getAnnouncements } from '@/api/client';
import { useLoad } from '@/hooks/useLoad';
import { shortDate } from '@/lib/format';
import { colors } from '@/theme';
export default function AnnouncementsScreen(){const loader=useCallback(()=>getAnnouncements(),[]);const{data,loading,error,refreshing,reload}=useLoad(loader,[]);if(loading&&!data)return <AppScreen scroll={false}><LoadingState/></AppScreen>;return <AppScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload}/>}><ScreenTitle title="Announcements" subtitle="Official messages from your school."/>{error?<ErrorState message={error} onRetry={reload}/>:null}{!data?.length?<EmptyState title="No announcements" message="New school messages will appear here."/>:data.map(item=><Card key={item.id}><Badge text={item.audience.toLowerCase()} tone="info"/><Text style={styles.title}>{item.subject}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{shortDate(item.sentAt||item.createdAt)}</Text></Card>)}</AppScreen>}
const styles=StyleSheet.create({title:{fontSize:17,fontWeight:'900',color:colors.navy},body:{color:colors.text,lineHeight:22},date:{fontSize:12,color:colors.muted}});
