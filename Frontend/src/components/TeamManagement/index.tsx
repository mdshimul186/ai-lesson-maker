import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, 
  Trash2, 
  Loader2,
  Users,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccountStore, useAuthStore } from '../../stores';
import { ITeamMember } from '../../interfaces';

interface DisplayTeamMember extends ITeamMember {
  key: string;
}

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

const TeamManagement: React.FC = () => {
  const { 
    currentAccount,
    fetchAccountDetails,
    inviteTeamMember,
    removeTeamMember,
    isLoading: isStoreLoading 
  } = useAccountStore();
  const { user } = useAuthStore();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'member'
  });
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  const mapAccountMembersToDisplay = useCallback((members?: ITeamMember[]): DisplayTeamMember[] => {
    return members?.map(m => ({ ...m, key: m.user_id })) || [];
  }, []);

  const refreshTeamMembers = useCallback(async () => {
    if (!currentAccount?.id) return;
    
    // Skip if we're already loading or if this isn't a team account
    if (isStoreLoading || currentAccount.type !== 'team') return;
    
    // Skip if we already have members data
    if (currentAccount.members && currentAccount.members.length > 0) return;
    
    setLoadingLocal(true);
    try {
      await fetchAccountDetails(currentAccount.id);
    } catch (error) {
      console.error('Failed to refresh team members:', error);
      toast.error('Failed to refresh team members. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  }, [currentAccount?.id, currentAccount?.type, currentAccount?.members, isStoreLoading, fetchAccountDetails]);

  useEffect(() => {
    // Only fetch team details if it's a team account and we haven't loaded members yet
    if (typeof window !== 'undefined' && currentAccount?.id && currentAccount.type === 'team') {
      const membersNotLoaded = !currentAccount.members || currentAccount.members.length === 0;
      const membersStillLoading = !isStoreLoading && membersNotLoaded;
      
      if (membersStillLoading) {
        refreshTeamMembers();
      }
    }
  }, [currentAccount?.id, currentAccount?.type, currentAccount?.members, isStoreLoading, refreshTeamMembers]);
  
  if (!currentAccount) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Please select an account first.</p>
      </Card>
    );
  }
  
  if (currentAccount.type !== 'team') {
    return (
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-2">Team Management</h4>
        <p className="text-muted-foreground">This feature is only available for team accounts.</p>
      </Card>
    );
  }

  const isCurrentUserOwner = currentAccount.owner_id === user?.id;
  const displayedTeamMembers = mapAccountMembersToDisplay(currentAccount.members);
  
  const handleInviteMember = async () => {
    if (!currentAccount?.id) return;
    
    if (!inviteFormData.email.trim()) {
      toast.error('Please enter the email address of the user to invite.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteFormData.email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    try {
      setIsInviting(true);
      await inviteTeamMember(currentAccount.id, inviteFormData.email, inviteFormData.role);
      toast.success('Invitation sent successfully!');
      setInviteFormData({ email: '', role: 'member' });
      setInviteModalVisible(false);
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      toast.error(error.response?.data?.detail || 'Failed to invite member. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };
  
  const handleRemoveMember = async (memberUserId: string) => {
    if (!currentAccount?.id) return;
    setIsRemoving(memberUserId);
    try {
      await removeTeamMember(currentAccount.id, memberUserId);
      toast.success('Member removed successfully!');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove member. Please try again.');
    } finally {
      setIsRemoving(null);
      setShowRemoveConfirm(null);
    }
  };
  
  const getStatusBadge = (status: ITeamMember['invitation_status']) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">ACTIVE</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">PENDING</Badge>;
      case 'rejected':
        return <Badge variant="destructive">REJECTED</Badge>;
      default:
        return <Badge variant="outline">{(status as string).toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold">Team Management</h4>
          {isCurrentUserOwner && (
            <Button 
              onClick={() => setInviteModalVisible(true)}
              disabled={isStoreLoading || loadingLocal}
              className="flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>
        
        {loadingLocal || isStoreLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedTeamMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h5 className="text-lg font-semibold mb-2">No Team Members</h5>
            <p className="text-muted-foreground">No team members yet. Invite someone to join!</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTeamMembers.map((member) => {
                  const canRemove = isCurrentUserOwner ? member.user_id !== currentAccount.owner_id : member.user_id === user?.id;
                  const isSelf = member.user_id === user?.id;
                  const isOwner = member.user_id === currentAccount.owner_id;
                  
                  return (
                    <TableRow key={member.key}>
                      <TableCell className="font-medium">{member.email}</TableCell>
                      <TableCell>
                        {ROLES.find(r => r.value === member.role)?.label || member.role}
                        {isOwner && <Badge variant="outline" className="ml-2">Owner</Badge>}
                      </TableCell>
                      <TableCell>{getStatusBadge(member.invitation_status)}</TableCell>
                      <TableCell>
                        {member.invitation_status === 'accepted' && member.joined_at 
                          ? new Date(member.joined_at).toLocaleDateString() 
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {canRemove && !isOwner && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowRemoveConfirm(member.user_id)}
                            disabled={isRemoving === member.user_id || isStoreLoading}
                            className="flex items-center space-x-1"
                          >
                            {isRemoving === member.user_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>{isSelf ? 'Leave' : 'Remove'}</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      
      {/* Invite Member Dialog */}
      <Dialog open={inviteModalVisible} onOpenChange={setInviteModalVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={inviteFormData.role} 
                onValueChange={(value) => setInviteFormData({ ...inviteFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setInviteModalVisible(false);
                setInviteFormData({ email: '', role: 'member' });
              }}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember}
              disabled={isInviting || isStoreLoading}
            >
              {isInviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Confirm Action</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {showRemoveConfirm === user?.id 
                ? "Are you sure you want to leave this team?" 
                : "Are you sure you want to remove this member?"
              }
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRemoveConfirm(null)}
              disabled={!!isRemoving}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => showRemoveConfirm && handleRemoveMember(showRemoveConfirm)}
              disabled={!!isRemoving}
            >
              {isRemoving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {showRemoveConfirm === user?.id ? 'Leave Team' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
