import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { port } from '@/constants/https';

interface User {
    id: number;
    username: string;
    email: string | null;
    role: 'admin' | 'pengamat' | 'guest';
    last_login: string | null;
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form states
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'pengamat' | 'guest'>('pengamat');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${port}users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.users || []);

            // For testing with mock data if API isn't working
            if (!data.users || data.users.length === 0) {
                setUsers([
                    {
                        id: 1,
                        username: 'admin',
                        email: 'admin@example.com',
                        role: 'admin',
                        last_login: new Date().toISOString()
                    },
                    {
                        id: 2,
                        username: 'pengamat',
                        email: 'pengamat@example.com',
                        role: 'pengamat',
                        last_login: new Date().toISOString()
                    },
                    {
                        id: 3,
                        username: 'guest',
                        email: null,
                        role: 'guest',
                        last_login: null
                    }
                ]);
            }
        } catch (error: any) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', error.message || 'Failed to load users');

            // For testing with mock data if API isn't working
            setUsers([
                {
                    id: 1,
                    username: 'admin',
                    email: 'admin@example.com',
                    role: 'admin',
                    last_login: new Date().toISOString()
                },
                {
                    id: 2,
                    username: 'pengamat',
                    email: 'pengamat@example.com',
                    role: 'pengamat',
                    last_login: new Date().toISOString()
                },
                {
                    id: 3,
                    username: 'guest',
                    email: null,
                    role: 'guest',
                    last_login: null
                }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const resetForm = () => {
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('pengamat');
        setSelectedUser(null);
        setEditMode(false);
    };

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setUsername(user.username);
        setEmail(user.email || '');
        setPassword(''); // Clear password field when editing
        setRole(user.role);
        setEditMode(true);
        setModalVisible(true);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setDeleteModalVisible(true);
    };

    const validateForm = () => {
        if (!username.trim()) {
            Alert.alert('Validasi Gagal', 'Username harus diisi');
            return false;
        }

        if (!editMode && !password.trim()) {
            Alert.alert('Validasi Gagal', 'Password harus diisi untuk user baru');
            return false;
        }

        if (email && !isValidEmail(email)) {
            Alert.alert('Validasi Gagal', 'Format email tidak valid');
            return false;
        }

        return true;
    };

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            const userData = {
                username,
                email: email || null,
                password: password || undefined,
                role,
            };

            let url = `${port}users`;
            let method = 'POST';

            if (editMode && selectedUser) {
                url = `${port}users/${selectedUser.id}`;
                method = 'PUT';

                // Don't send empty password during edit
                if (!password) {
                    delete userData.password;
                }
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save user');
            }

            // For testing without API
            if (editMode && selectedUser) {
                // Update the user in the local state
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === selectedUser.id
                            ? {
                                ...user,
                                username,
                                email: email || null,
                                role
                            }
                            : user
                    )
                );
            } else {
                // Add a new user to the local state
                const newUser = {
                    id: Math.max(0, ...users.map(u => u.id)) + 1,
                    username,
                    email: email || null,
                    role,
                    last_login: null
                };
                setUsers(prevUsers => [newUser, ...prevUsers]);
            }

            Alert.alert('Sukses', editMode ? 'User berhasil diperbarui' : 'User berhasil dibuat');
            setModalVisible(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error('Error saving user:', error);
            Alert.alert('Error', error.message || 'Gagal menyimpan user');

            // For testing without API - just simulate success
            if (editMode && selectedUser) {
                // Update the user in the local state
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === selectedUser.id
                            ? {
                                ...user,
                                username,
                                email: email || null,
                                role
                            }
                            : user
                    )
                );
            } else {
                // Add a new user to the local state
                const newUser = {
                    id: Math.max(0, ...users.map(u => u.id)) + 1,
                    username,
                    email: email || null,
                    role,
                    last_login: null
                };
                setUsers(prevUsers => [newUser, ...prevUsers]);
            }

            setModalVisible(false);
            resetForm();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);
            const response = await fetch(`${port}users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

            // For testing without API
            setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));

            Alert.alert('Sukses', 'User berhasil dihapus');
            setDeleteModalVisible(false);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            Alert.alert('Error', error.message || 'Gagal menghapus user');

            // For testing without API - just simulate success
            setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
            setDeleteModalVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            user.username.toLowerCase().includes(query) ||
            (user.email && user.email.toLowerCase().includes(query)) ||
            user.role.toLowerCase().includes(query)
        );
    });

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Belum pernah';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Tanggal tidak valid';

        // Format: DD/MM/YYYY HH:MM
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const renderRoleBadge = (userRole: string) => {
        let backgroundColor = '#6366f1'; // Default color

        switch (userRole) {
            case 'admin':
                backgroundColor = '#ef4444'; // Red for admin
                break;
            case 'pengamat':
                backgroundColor = '#3b82f6'; // Blue for pengamat
                break;
            case 'guest':
                backgroundColor = '#9ca3af'; // Gray for guest
                break;
        }

        return (
            <View style={[styles.roleBadge, { backgroundColor }]}>
                <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
        );
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userItem}>
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.email}>{item.email || 'Tidak ada email'}</Text>
                <View style={styles.detailsRow}>
                    {renderRoleBadge(item.role)}
                    <Text style={styles.lastLogin}>
                        Login terakhir: {formatDate(item.last_login)}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(item)}
                >
                    <MaterialIcons
                        name="edit"
                        size={20}
                        color="#3b82f6"
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openDeleteModal(item)}
                >
                    <MaterialIcons
                        name="delete"
                        size={20}
                        color="#ef4444"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manajemen User</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={openAddModal}
                >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addButtonText}>Tambah User</Text>
                </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari user..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                />
            </View>

            <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyList}>
                        <Feather name="users" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>Tidak ada user ditemukan</Text>
                    </View>
                }
            />

            {/* User Form Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editMode ? 'Edit User' : 'Tambah User'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Username*</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Masukkan username"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Masukkan email (opsional)"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    Password{editMode ? ' (kosongkan jika tidak ingin mengubah)' : '*'}
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder={editMode ? "Kosongkan jika tidak ingin mengubah" : "Masukkan password"}
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Role*</Text>
                                <View style={styles.roleOptions}>
                                    <TouchableOpacity
                                        style={[styles.roleOption, role === 'admin' && styles.roleOptionSelected]}
                                        onPress={() => setRole('admin')}
                                    >
                                        <Text style={[
                                            styles.roleOptionText,
                                            role === 'admin' && styles.roleOptionTextSelected
                                        ]}>
                                            Admin
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.roleOption, role === 'pengamat' && styles.roleOptionSelected]}
                                        onPress={() => setRole('pengamat')}
                                    >
                                        <Text style={[
                                            styles.roleOptionText,
                                            role === 'pengamat' && styles.roleOptionTextSelected
                                        ]}>
                                            Pengamat
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.roleOption, role === 'guest' && styles.roleOptionSelected]}
                                        onPress={() => setRole('guest')}
                                    >
                                        <Text style={[
                                            styles.roleOptionText,
                                            role === 'guest' && styles.roleOptionTextSelected
                                        ]}>
                                            Guest
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Batal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.saveButtonText}>
                                    {editMode ? 'Update' : 'Simpan'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <View style={styles.deleteModalHeader}>
                            <Ionicons name="warning" size={32} color="#ef4444" />
                            <Text style={styles.deleteModalTitle}>Konfirmasi Hapus</Text>
                        </View>

                        <Text style={styles.deleteModalText}>
                            Apakah Anda yakin ingin menghapus user "{selectedUser?.username}"? Tindakan ini tidak dapat dibatalkan.
                        </Text>

                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={styles.cancelDeleteButton}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelDeleteButtonText}>Batal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmDeleteButton}
                                onPress={handleDelete}
                            >
                                <Text style={styles.confirmDeleteButtonText}>Hapus</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#334155',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '500',
        marginLeft: 4,
    },
    list: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    lastLogin: {
        fontSize: 12,
        color: '#94a3b8',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    emptyList: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 12,
        color: '#94a3b8',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    form: {
        padding: 16,
        maxHeight: 400,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e293b',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        color: '#334155',
    },
    roleOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleOption: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    roleOptionSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    roleOptionText: {
        color: '#64748b',
    },
    roleOptionTextSelected: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    // Delete modal styles
    deleteModalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        padding: 20,
    },
    deleteModalHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
        color: '#0f172a',
    },
    deleteModalText: {
        color: '#4b5563',
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    deleteModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelDeleteButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    cancelDeleteButtonText: {
        color: '#64748b',
        fontWeight: '500',
    },
    confirmDeleteButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    confirmDeleteButtonText: {
        color: 'white',
        fontWeight: '500',
    },
});

export default UserManagement; 