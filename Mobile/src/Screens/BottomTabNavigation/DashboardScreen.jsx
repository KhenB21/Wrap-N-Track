import { View, Text, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native'
import React from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import FontAwesome5  from 'react-native-vector-icons/FontAwesome5'
import MenuTitle from '../../Components/MenuTitle'
import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'

const DashboardScreen = ({route}) => {
    const { pageTitle } = route.params;
    const navigation = useNavigation();

    useEffect(() => {
        const backAction = () => {
            if (pageTitle === 'Dashboard') {
                Alert.alert(
                    "Log Out",
                    "Do you want to Log out?",
                    [
                        { text: "Cancel", onPress: () => null, style: "cancel" },
                        { text: "Yes", onPress: () => navigation.replace('Login') }
                    ]
                );
                return true;
            }
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [pageTitle]);

    return (
        <View style={{flex: 1, alignItems: 'center', paddingBottom: 165}}>
            <View style={{width: '100%', paddingHorizontal: 10, alignItems: 'center', height: 170, backgroundColor: '#696A8F'}}>
                <View style={{width: '100%', flex: 1}}>
                    <MenuTitle pageTitle={pageTitle}/>
                    <Text style={{color: '#F0F0F0'}}>Welcome, Terence!</Text>                   
                </View>
            </View>
            <View style={{width: '100%', alignItems: 'center', backgroundColor: '#F0F0F0' }}>
                <ScrollView 
                    style={{width: '100%', height: '100%'}} 
                    contentContainerStyle={{ padding: 10, paddingBottom: 75, alignItems: 'center' }}
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                >

                    {/* Inventory Overview */}
                    <View style={{width: '100%', padding: 10, borderRadius: 10, backgroundColor: '#FDFDFD', marginBottom: 10}}>

                        {/* Title */}
                        <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 20}}>Inventory Overview</Text>

                        {/* Buttons */}
                        <View style={{flexDirection: 'row', width: '100%', marginBottom: 16}}>
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#187498', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Products</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18,}}>423</Text>
                                </View>                
                            </View> 
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#36AE7C', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>                                   
                                    <Text style={{fontWeight: 400}}>Total Product Units</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>15,031</Text>
                                </View>                
                            </View> 
                        </View> 
                        <View style={{flexDirection: 'row', width: '100%'}}>
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#F9D923', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>                                  
                                    <Text style={{fontWeight: 400}}>Replenishment</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>47</Text>
                                </View>                
                            </View> 
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#ff595e', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>                                   
                                    <Text style={{fontWeight: 400, color: '#D61414'}}>Low in Stock</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>207</Text>
                                </View>                
                            </View> 
                        </View>                 
                    </View>

                    {/* Sales Overview */}
                    <View style={{width: '100%', padding: 10, borderRadius: 10, backgroundColor: '#FDFDFD', marginBottom: 10}}>

                        {/* Title */}
                        <Text style={{fontWeight: 'bold', fontSize: 16}}>Sales Overview</Text>
                        <Text style={{fontWeight: 500, fontSize: 12, color: '#888888', marginBottom: 20}}>February</Text>

                        {/* Buttons */}
                        <View style={{flexDirection: 'row', width: '100%', marginBottom: 16}}>


                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: 'blue', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Revenue</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>423</Text>
                                </View>                
                            </View> 
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#F5DB13', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Orders</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>15,031</Text>
                                </View>                
                            </View> 
                        </View> 
                        <View style={{flexDirection: 'row', width: '100%'}}>
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#F58413', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Units Sold</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>423</Text>
                                </View>                
                            </View> 
                            <View style={{flexDirection: 'row', width: '50%'}}>
                                <View style={{height: 50, width: 5, backgroundColor: '#D61414', borderRadius: 5}}/>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Customers</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>207</Text>
                                </View>                
                            </View> 
                        </View>                 
                    </View>
                    <View style={{width: '100%', padding: 10, borderRadius: 10, backgroundColor: '#FDFDFD'}}>

                        {/* Sales Activity */}
                        <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 20}}>Sales Overview</Text>
                        <View style={{flexDirection: 'row', width: '100%', flexDirection: 'column'}}>
                            <View style={{flexDirection: 'row', marginBottom: 20}}>
                                <View style={{height: 50, width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: '#D61414'}}>
                                    <Icon name='package' size={32} color={'#FDFDFD'}/>
                                </View>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Customers</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>207</Text>
                                </View>
                            </View>
                            <View style={{flexDirection: 'row', marginBottom: 20}}>
                                <View style={{height: 50, width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: '#F58413'}}>
                                    <Icon name='package' size={32} color={'#FDFDFD'}/>
                                </View>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Customers</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>207</Text>
                                </View>
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                <View style={{height: 50, width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: 'blue'}}>
                                    <Icon name='package' size={32} color={'#FDFDFD'}/>
                                </View>
                                <View style={{justifyContent: 'space-between', marginLeft: 10}}>
                                    <Text style={{fontWeight: 400}}>Total Customers</Text>
                                    <Text style={{fontWeight: 500, fontSize: 18}}>207</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    )
}

export default DashboardScreen;