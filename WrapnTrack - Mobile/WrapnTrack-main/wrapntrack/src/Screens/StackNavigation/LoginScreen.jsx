import { View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import TextInputForm from '../../Components/TextInputForm'
import ButtonTextInput from '../../Components/ButtonTextInput'
import { useNavigation } from '@react-navigation/native'

const LoginScreen = () => {
    const [isVisible, setVisible] = useState(true);
    const navigation = useNavigation();

    const buttonFunction = () => {
        setVisible(prev => !prev);
    }

    return (
        <View style={{flex: 1, marginTop: 30, backgroundColor: '#F0F0F0'}}>
            <View style={{alignItems: 'center'}}>
                <ImageBackground 
                    source={require('../../../assets/Pensee logos/pensee-logo-only.png')} 
                    style={{width: '100%', height: '100%', tintColor: '#ccc'}} 
                    imageStyle={{opacity: 0.2}}
                >
                    <View style={{flex: 1, width: '100%', alignItems: 'center'}}>  
                        <View style={{flex: 3, width: '100%', alignItems: 'center', marginVertical: 20}}>
                            <Image source={require('../../../assets/Pensee logos/pensee-logo-only.png')} style={{width: 150, height: 150}}/>
                            <Text style={{fontWeight: 'bold', fontSize: 36, color: '#696A8F', fontFamily: 'times new roman'}}>
                                Wrap n' Track
                            </Text>
                            <Text style={{fontSize: 16, color: '#696A8F', fontFamily: 'times new roman'}}>By</Text>
                            <Image source={require('../../../assets/Pensee logos/pensee-name-only.png')} style={{width: 125, height: 75}}/>
                        </View>               
                        <View style={{flex: 4, width: '100%', bottom:  0, backgroundColor: '#FDFDFD', paddingHorizontal: 30, paddingVertical: 20, borderTopRightRadius: 30, borderTopLeftRadius: 30, alignItems: 'center'}}>
                            <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 10}}>Login</Text>
                            <TextInputForm label={'Username'}/>
                            <ButtonTextInput label={'Password'} icon={isVisible ? 'eye' : 'eye-off'} secureTextEntry={isVisible} buttonFunction={buttonFunction}/>
                            <TouchableOpacity style={{padding: 10}}>
                                <Text style={{color:'#888888', fontWeight: '500'}}>Forgot Password?</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{width: '100%', height: 50, backgroundColor: '#696A8F', justifyContent: 'center', alignItems: 'center', borderRadius: 5, marginTop: 20}} 
                                onPress={() => navigation.navigate('Drawer')}
                            >
                                <Text style={{fontSize: 16, color: '#FDFDFD'}}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ImageBackground>
            </View>
        </View>
    );
};

export default LoginScreen;
