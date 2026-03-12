'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { usePanels } from '@/contexts/PanelContext';
import { usePresence } from '@/contexts/PresenceContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import CoverImageCropper from '@/components/image-manip/CoverImageCropper/CoverImageCropper';
import ProfileImageCropper from '@/components/image-manip/ProfileImageCropper/ProfileImageCropper';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';
import BottomSheet from '@/components/dialogs/BottomSheet/BottomSheet';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { imageUrl } from '@/lib/imageUrl';
import AddGroupMembersPanel from './AddGroupMembersPanel';
import styles from './GroupProfilePanel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  status?: string;
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  ownerId?: string;
  members: GroupMember[];
}

interface Props {
  groupId: string;
  currentUserId: string;
  onGroupLeft?: () => void;
  initialGroup?: GroupInfo;
}

export default function GroupProfilePanel({ groupId, currentUserId, onGroupLeft, initialGroup }: Props) {
  const [group, setGroup] = useState<GroupInfo | null>(initialGroup ?? null);
  const [loading, setLoading] = useState(!initialGroup);
  const [error, setError] = useState(false);

  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const [coverSheetOpen, setCoverSheetOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const [sheetMember, setSheetMember] = useState<GroupMember | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const coverFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { openPanel, closePanel, updatePanelMeta } = usePanels();
  const openUserProfile = useOpenUserProfile();
  const { getPresence, requestPresence } = usePresence();
  const { socket } = useWebSocket();

  const memberPresence = (userId: string) =>
    userId === currentUserId
      ? { status: 'online' as const, lastSeen: null }
      : getPresence(userId);

  const isDark = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') !== 'light'
    : true;

  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchGroup = useCallback(async (retries = 2, silent = false) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGroup(data.group);
      setLoading(false);
    } catch (e: any) {
      if (retries > 0) {
        retryTimer.current = setTimeout(() => fetchGroup(retries - 1, silent), 1000);
        return;
      }
      if (!silent) {
        setError(true);
      }
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup(2, !!initialGroup);
    return () => clearTimeout(retryTimer.current);
  }, [fetchGroup, initialGroup]);

  useEffect(() => {
    if (group) {
      requestPresence(group.members.map(m => m.userId));
    }
  }, [group, requestPresence]);

  // Real-time socket sync — adaptive per event type
  useEffect(() => {
    if (!socket) return;

    const onUpdated = (data: { group: Partial<GroupInfo> & { id: string } }) => {
      if (data.group.id !== groupId) return;
      setGroup(prev => prev ? { ...prev, ...data.group } : prev);
    };

    const onMemberJoined = (data: { groupId: string; member?: GroupMember }) => {
      if (data.groupId !== groupId || !data.member) return;
      setGroup(prev => {
        if (!prev) return prev;
        if (prev.members.some(m => m.userId === data.member!.userId)) return prev;
        return { ...prev, members: [...prev.members, { ...data.member!, status: 'accepted' }] };
      });
    };

    const onMemberLeft = (data: { groupId: string; memberId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.filter(m => m.userId !== data.memberId) } : prev);
    };

    const onMemberPromoted = (data: { groupId: string; memberId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === data.memberId ? { ...m, role: 'admin' } : m) } : prev);
    };

    const onMemberDemoted = (data: { groupId: string; memberId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === data.memberId ? { ...m, role: 'member' } : m) } : prev);
    };

    const onOwnerChanged = (data: { groupId: string; newOwnerId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === data.newOwnerId ? { ...m, role: 'owner' } : m) } : prev);
    };

    const onOwnershipTransferred = (data: { groupId: string; newOwnerId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === data.newOwnerId ? { ...m, role: 'owner' } : m) } : prev);
    };

    const onOwnerSteppedDown = (data: { groupId: string; userId: string }) => {
      if (data.groupId !== groupId) return;
      setGroup(prev => prev ? { ...prev, members: prev.members.map(m => m.userId === data.userId ? { ...m, role: 'admin' } : m) } : prev);
    };

    socket.on('group:updated', onUpdated);
    socket.on('group:memberJoined', onMemberJoined);
    socket.on('group:memberLeft', onMemberLeft);
    socket.on('group:memberPromoted', onMemberPromoted);
    socket.on('group:memberDemoted', onMemberDemoted);
    socket.on('group:ownerChanged', onOwnerChanged);
    socket.on('group:ownershipTransferred', onOwnershipTransferred);
    socket.on('group:ownerSteppedDown', onOwnerSteppedDown);
    return () => {
      socket.off('group:updated', onUpdated);
      socket.off('group:memberJoined', onMemberJoined);
      socket.off('group:memberLeft', onMemberLeft);
      socket.off('group:memberPromoted', onMemberPromoted);
      socket.off('group:memberDemoted', onMemberDemoted);
      socket.off('group:ownerChanged', onOwnerChanged);
      socket.off('group:ownershipTransferred', onOwnershipTransferred);
      socket.off('group:ownerSteppedDown', onOwnerSteppedDown);
    };
  }, [socket, groupId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <i className="fa-solid fa-circle-notch fa-spin" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <i className="fa-solid fa-users-slash" style={{ fontSize: '32px' }} />
          <span>Could not load group</span>
        </div>
      </div>
    );
  }

  const myMember = group.members.find(m => m.userId === currentUserId);
  const isOwner = myMember?.role === 'owner';
  const isAdmin = isOwner || myMember?.role === 'admin';

  const nameOf = (m: GroupMember) =>
    (m.user.displayName || m.user.username.replace(/^@/, '')).toLowerCase();
  const alphSort = (a: GroupMember, b: GroupMember) => nameOf(a).localeCompare(nameOf(b));

  const activeMembers = group.members.filter(m => m.status !== 'pending');
  const owners = activeMembers.filter(m => m.role === 'owner').sort(alphSort);
  const admins = activeMembers.filter(m => m.role === 'admin').sort(alphSort);
  const regulars = activeMembers.filter(m => m.role === 'member').sort(alphSort);
  const pending = group.members.filter(m => m.status === 'pending').sort(alphSort);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  // ── Cover image handlers ─────────────────────────────────────────────
  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10MB', 'error');
      e.target.value = '';
      return;
    }
    setSelectedCoverFile(file);
    setShowCoverCropper(true);
    e.target.value = '';
  };

  const handleCoverCropComplete = async (croppedFile: File) => {
    setShowCoverCropper(false);
    setSelectedCoverFile(null);
    setCoverUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const form = new FormData();
      form.append('coverImage', croppedFile);
      const res = await fetch(`${API}/api/groups/${groupId}/cover-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setCoverLoaded(false);
      setGroup(prev => prev ? { ...prev, coverImage: data.url } : prev);
      showToast('Cover image updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload cover image', 'error');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleDeleteCover = async () => {
    setCoverSheetOpen(false);
    setCoverUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API}/api/groups/${groupId}/cover-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoverLoaded(false);
      setGroup(prev => prev ? { ...prev, coverImage: null } : prev);
      showToast('Cover image removed', 'success');
    } catch {
      showToast('Failed to remove cover image', 'error');
    } finally {
      setCoverUploading(false);
    }
  };

  // ── Avatar image handlers ────────────────────────────────────────────
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      e.target.value = '';
      return;
    }
    setSelectedAvatarFile(file);
    setShowAvatarCropper(true);
    e.target.value = '';
  };

  const handleAvatarCropComplete = async (croppedFile: File) => {
    setShowAvatarCropper(false);
    setSelectedAvatarFile(null);
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const form = new FormData();
      form.append('profileImage', croppedFile);
      const res = await fetch(`${API}/api/groups/${groupId}/profile-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setAvatarLoaded(false);
      setGroup(prev => prev ? { ...prev, profileImage: data.url } : prev);
      updatePanelMeta(`group-profile-${groupId}`, { profileImage: data.url });
      updatePanelMeta(`group-${groupId}`, { profileImage: data.url });
      showToast('Group avatar updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload group avatar', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarSheetOpen(false);
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API}/api/groups/${groupId}/profile-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvatarLoaded(false);
      setGroup(prev => prev ? { ...prev, profileImage: null } : prev);
      updatePanelMeta(`group-profile-${groupId}`, { profileImage: null });
      updatePanelMeta(`group-${groupId}`, { profileImage: null });
      showToast('Group avatar removed', 'success');
    } catch {
      showToast('Failed to remove group avatar', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Member actions ───────────────────────────────────────────────────
  const handlePromote = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Make Admin',
      message: `Make ${name} an admin? They will be able to edit the group, manage members, and remove other members.`,
      urgency: 'info',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Make Admin', variant: 'primary', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}/promote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m =>
            m.userId === member.userId ? { ...m, role: 'admin' } : m
          ),
        } : prev);
        showToast(`${name} is now an admin`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to promote member', 'error');
      }
    } catch {
      showToast('Failed to promote member', 'error');
    }
  };

  const handleDemote = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const isSelfDemote = member.userId === currentUserId;
    const confirmed = await showConfirmation({
      title: isSelfDemote ? 'Step Down as Admin' : 'Remove Admin',
      message: isSelfDemote
        ? 'Step down as admin? You will become a regular member.'
        : `Remove admin privileges from ${name}? They will become a regular member.`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: isSelfDemote ? 'Step Down' : 'Remove Admin', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}/demote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m =>
            m.userId === member.userId ? { ...m, role: 'member' } : m
          ),
        } : prev);
        showToast(`${name} is now a regular member`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to demote member', 'error');
      }
    } catch {
      showToast('Failed to demote member', 'error');
    }
  };

  const handleMakeOwner = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Make Owner',
      message: `Make ${name} an owner of this group? They will have full control including the ability to delete the group.`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Make Owner', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/transfer-ownership`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: member.userId }),
      });
      if (res.ok) {
        showToast(`${name} is now an owner`, 'success');
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to make owner', 'error');
      }
    } catch {
      showToast('Failed to make owner', 'error');
    }
  };

  const handleOwnerStepDown = async () => {
    const confirmed = await showConfirmation({
      title: 'Step Down as Owner',
      message: 'Step down as owner? You will become an admin.',
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Step Down', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/step-down`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('You stepped down as owner', 'success');
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to step down', 'error');
      }
    } catch {
      showToast('Failed to step down', 'error');
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Remove Member',
      message: `Remove ${name} from the group? They will need to be re-invited to rejoin.`,
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Remove', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`${name} has been removed from the group`, 'success');
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Failed to remove member', 'error');
    }
  };

  const handleRevokeInvite = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Revoke Invite',
      message: `Revoke the pending invite for ${name}?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Revoke', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Invite for ${name} has been revoked`, 'success');
        fetchGroup();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to revoke invite', 'error');
      }
    } catch {
      showToast('Failed to revoke invite', 'error');
    }
  };

  const openAddMembersPanel = () => {
    const panelId = `add-members-${groupId}`;
    openPanel(
      panelId,
      <AddGroupMembersPanel
        groupId={groupId}
        existingMemberIds={group.members.map(m => m.userId)}
        onMembersAdded={() => {
          fetchGroup();
        }}
      />,
      'Add Members',
      'center',
      undefined,
      undefined,
      true,
    );
  };

  interface MemberAction {
    label: string;
    icon: string;
    danger?: boolean;
    handler: () => void;
  }

  const getActionsForMember = (member: GroupMember): MemberAction[] => {
    const isSelf = member.userId === currentUserId;
    const actions: MemberAction[] = [];

    if (member.status === 'pending') {
      if (isAdmin && !isSelf) {
        actions.push({ label: 'Revoke Invite', icon: 'fas fa-xmark', danger: true, handler: () => handleRevokeInvite(member) });
      }
      return actions;
    }

    if (member.role === 'owner') {
      if (isSelf && owners.length > 1) {
        actions.push({ label: 'Step Down as Owner', icon: 'fas fa-arrow-down', handler: handleOwnerStepDown });
      }
    } else if (member.role === 'admin') {
      if (isOwner && !isSelf) {
        actions.push({ label: 'Make Owner', icon: 'fas fa-crown', handler: () => handleMakeOwner(member) });
        actions.push({ label: 'Revoke Admin', icon: 'fas fa-shield-xmark', handler: () => handleDemote(member) });
        actions.push({ label: 'Remove from Group', icon: 'fas fa-user-minus', danger: true, handler: () => handleRemoveMember(member) });
      }
      if (isSelf && !isOwner) {
        actions.push({ label: 'Step Down as Admin', icon: 'fas fa-shield-xmark', handler: () => handleDemote(member) });
      }
    } else {
      if (isAdmin && !isSelf) {
        actions.push({ label: 'Make Admin', icon: 'fas fa-shield', handler: () => handlePromote(member) });
        actions.push({ label: 'Remove from Group', icon: 'fas fa-user-minus', danger: true, handler: () => handleRemoveMember(member) });
      }
    }

    return actions;
  };

  const handleSheetAction = (action: MemberAction) => {
    setSheetMember(null);
    setTimeout(() => action.handler(), 150);
  };

  const startEditingName = () => {
    if (!group || !isAdmin) return;
    setNameValue(group.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleSaveName = async () => {
    if (!group) return;
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === group.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        const newName = data.group.name;
        setGroup(prev => prev ? { ...prev, name: newName } : prev);
        updatePanelMeta(`group-${groupId}`, { title: newName });
        updatePanelMeta(`group-profile-${groupId}`, { title: newName });
        showToast('Group name updated', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to update name', 'error');
      }
    } catch {
      showToast('Failed to update name', 'error');
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = await showConfirmation({
      title: 'Leave Group',
      message: isOwner
        ? `You are an owner of "${group.name}". Are you sure you want to leave?`
        : `Leave "${group.name}"?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Leave Group', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Left "${group.name}"`, 'success');
        closePanel(`group-profile-${groupId}`);
        onGroupLeft?.();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to leave group', 'error');
      }
    } catch {
      showToast('Failed to leave group', 'error');
    }
  };

  return (
    <div className={styles.page}>
      {/* Cover image cropper */}
      {showCoverCropper && selectedCoverFile && (
        <CoverImageCropper
          imageFile={selectedCoverFile}
          onCropComplete={handleCoverCropComplete}
          onCancel={() => { setShowCoverCropper(false); setSelectedCoverFile(null); }}
          isDark={isDark}
        />
      )}

      {/* Avatar image cropper */}
      {showAvatarCropper && selectedAvatarFile && (
        <ProfileImageCropper
          imageFile={selectedAvatarFile}
          onCropComplete={handleAvatarCropComplete}
          onCancel={() => { setShowAvatarCropper(false); setSelectedAvatarFile(null); }}
          isDark={isDark}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={coverFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleCoverFileSelect} style={{ display: 'none' }} />
      <input ref={avatarFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarFileSelect} style={{ display: 'none' }} />

      {/* Hero: cover + avatar */}
      <div className={styles.hero}>
        <div className={styles.cover}>
          {!coverLoaded && <div className={styles.coverSkeleton} />}
          <img
            src={group.coverImage || '/cover/default-cover.jpg'}
            alt="Cover"
            className={styles.coverImg}
            style={{ opacity: coverUploading ? 0.5 : coverLoaded ? 1 : 0 }}
            onLoad={() => setCoverLoaded(true)}
          />

          {coverUploading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#fff' }} />
            </div>
          )}

          {isAdmin && !coverUploading && (
            <button
              className={styles.coverCameraBtn}
              onClick={() => setCoverSheetOpen(true)}
              aria-label="Change cover image"
            >
              <i className="fas fa-camera" />
            </button>
          )}
        </div>

        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            {group.profileImage ? (
              <>
                {!avatarLoaded && <div className={styles.avatarSkeleton} />}
                <img src={imageUrl(group.profileImage, 'md')!} alt={group.name} className={styles.avatarImg} style={{ opacity: avatarUploading ? 0.5 : avatarLoaded ? 1 : 0 }} onLoad={() => setAvatarLoaded(true)} />
              </>
            ) : (
              <div className={styles.avatarFallback} style={{ opacity: avatarUploading ? 0.5 : 1 }}>
                {getInitial(group.name)}
              </div>
            )}

            {avatarUploading && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#fff' }} />
              </div>
            )}
          </div>

          {isAdmin && !avatarUploading && (
            <button
              className={styles.avatarCameraBtn}
              onClick={() => setAvatarSheetOpen(true)}
              aria-label="Change group avatar"
            >
              <i className="fas fa-camera" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.nameBlock}>
          {editingName ? (
            <div className={styles.nameEditRow}>
              <input
                ref={nameInputRef}
                className={styles.nameInput}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={64}
                disabled={savingName}
              />
              <button className={styles.nameSaveBtn} onClick={handleSaveName} disabled={savingName}>
                {savingName ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              </button>
              <button className={styles.nameCancelBtn} onClick={() => setEditingName(false)} disabled={savingName}>
                <i className="fas fa-xmark" />
              </button>
            </div>
          ) : (
            <div className={styles.nameRow} onClick={isAdmin ? startEditingName : undefined} style={{ cursor: isAdmin ? 'pointer' : undefined }}>
              <h2 className={styles.groupName}>{group.name}</h2>
              {isAdmin && <i className="fas fa-pen" style={{ fontSize: '16px', opacity: 0.5, color: 'var(--text-secondary)' }} />}
            </div>
          )}
          <p className={styles.memberCount}>
            {group.members.filter(m => m.status !== 'pending').length} member{group.members.filter(m => m.status !== 'pending').length !== 1 ? 's' : ''}
            {group.members.some(m => m.status === 'pending') && (
              <span style={{ opacity: 0.6 }}> · {group.members.filter(m => m.status === 'pending').length} pending</span>
            )}
          </p>
        </div>

        {/* Member groups */}
        {owners.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-crown" style={{ fontSize: '10px', color: '#f59e0b' }} />{' '}
              Owner{owners.length !== 1 ? 's' : ''}
            </h3>
            <div className={styles.sectionBody}>
              {owners.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const actions = getActionsForMember(member);
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={memberPresence(member.userId)} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                    {actions.length > 0 && (
                      <button className={styles.moreBtn} onClick={() => setSheetMember(member)} title="Actions">
                        <i className="fas fa-ellipsis-vertical" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {admins.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-shield" style={{ fontSize: '10px', color: '#6366f1' }} />{' '}
              Admin{admins.length !== 1 ? 's' : ''}
            </h3>
            <div className={styles.sectionBody}>
              {admins.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const actions = getActionsForMember(member);
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={memberPresence(member.userId)} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                    {actions.length > 0 && (
                      <button className={styles.moreBtn} onClick={() => setSheetMember(member)} title="Actions">
                        <i className="fas fa-ellipsis-vertical" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(regulars.length > 0 || pending.length > 0) && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-users" style={{ fontSize: '10px' }} />{' '}
              Members
            </h3>
            <div className={styles.sectionBody}>
              {regulars.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const actions = getActionsForMember(member);
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={memberPresence(member.userId)} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                    {actions.length > 0 && (
                      <button className={styles.moreBtn} onClick={() => setSheetMember(member)} title="Actions">
                        <i className="fas fa-ellipsis-vertical" />
                      </button>
                    )}
                  </div>
                );
              })}
              {pending.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const actions = getActionsForMember(member);
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow} style={{ opacity: 0.5 }}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={memberPresence(member.userId)} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                      <span className={styles.memberBadge} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <i className="fas fa-clock" style={{ fontSize: '8px' }} /> Pending
                      </span>
                    </div>
                    {actions.length > 0 && (
                      <button className={styles.moreBtn} onClick={() => setSheetMember(member)} title="Actions">
                        <i className="fas fa-ellipsis-vertical" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Add Members */}
        {isAdmin && (
          <button className={styles.addMembersBtn} onClick={openAddMembersPanel}>
            <i className="fas fa-user-plus" /> Add Members
          </button>
        )}

        {/* Leave */}
        <div className={styles.actions}>
          <button className={styles.leaveBtn} onClick={handleLeaveGroup}>
            <i className="fas fa-arrow-right-from-bracket" /> Leave Group
          </button>
        </div>
      </div>

      {/* Cover image bottom sheet */}
      <BottomSheet isOpen={coverSheetOpen} onClose={() => setCoverSheetOpen(false)} heightMode="auto" title="Cover Image">
        <div className={styles.sheetActions}>
          <button className={styles.sheetActionBtn} onClick={() => { setCoverSheetOpen(false); setTimeout(() => coverFileRef.current?.click(), 350); }}>
            <i className="fas fa-camera" />
            <span>Upload New Cover</span>
          </button>
          {group?.coverImage && (
            <button className={`${styles.sheetActionBtn} ${styles.sheetActionDanger}`} onClick={handleDeleteCover}>
              <i className="fas fa-trash-alt" />
              <span>Remove Cover</span>
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Avatar bottom sheet */}
      <BottomSheet isOpen={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} heightMode="auto" title="Group Picture">
        <div className={styles.sheetActions}>
          <button className={styles.sheetActionBtn} onClick={() => { setAvatarSheetOpen(false); setTimeout(() => avatarFileRef.current?.click(), 350); }}>
            <i className="fas fa-camera" />
            <span>Upload New Picture</span>
          </button>
          {group?.profileImage && (
            <button className={`${styles.sheetActionBtn} ${styles.sheetActionDanger}`} onClick={handleDeleteAvatar}>
              <i className="fas fa-trash-alt" />
              <span>Remove Group Picture</span>
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Member actions bottom sheet */}
      <BottomSheet
        isOpen={!!sheetMember}
        onClose={() => setSheetMember(null)}
        heightMode="auto"
        title={sheetMember ? (sheetMember.user.displayName || sheetMember.user.username.replace(/^@/, '')) : ''}
      >
        {sheetMember && (
          <div className={styles.sheetActions}>
            {getActionsForMember(sheetMember).map((action, i) => (
              <button
                key={i}
                className={`${styles.sheetActionBtn} ${action.danger ? styles.sheetActionDanger : ''}`}
                onClick={() => handleSheetAction(action)}
              >
                <i className={action.icon} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
