/**
 * TriggerFormModal Component
 *
 * Modal for creating and editing triggers
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalTitle,
  ModalCloseButton,
} from '../../ui/Modal';
import { TriggerBasicInfo } from './TriggerBasicInfo';
import { ScheduleConfig } from './ScheduleConfig';
import { InputMessageConfig } from './InputMessageConfig';
import { useTriggerStore } from '../../../stores/triggerStore';
import type { Trigger, CreateTriggerRequest, UpdateTriggerRequest } from '../../../types/trigger';
import toast from 'react-hot-toast';

export interface TriggerFormModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Trigger to edit (null for create mode)
   */
  trigger?: Trigger | null;

  /**
   * Callback when trigger is saved
   */
  onSave?: () => void;
}

interface FormData {
  name: string;
  description: string;
  agentId: string;
  cronExpression: string;
  timezone: string;
  inputMessage: string;
}

export function TriggerFormModal({ isOpen, onClose, trigger, onSave }: TriggerFormModalProps) {
  const { t } = useTranslation();
  const { createTrigger, updateTrigger } = useTriggerStore();
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!trigger;

  // Initialize form data
  const [formData, setFormData] = useState<FormData>(() => {
    if (trigger?.type === 'schedule' && trigger.scheduleConfig) {
      return {
        name: trigger.name,
        description: trigger.description || '',
        agentId: trigger.agentId,
        cronExpression: trigger.scheduleConfig.expression,
        timezone: trigger.scheduleConfig.timezone || 'Asia/Tokyo',
        inputMessage: trigger.prompt,
      };
    }
    return {
      name: '',
      description: '',
      agentId: '',
      cronExpression: '0 0 * * ? *',
      timezone: 'Asia/Tokyo',
      inputMessage: '',
    };
  });

  // Reset form when trigger changes
  useEffect(() => {
    if (trigger) {
      if (trigger.type === 'schedule' && trigger.scheduleConfig) {
        setFormData({
          name: trigger.name,
          description: trigger.description || '',
          agentId: trigger.agentId,
          cronExpression: trigger.scheduleConfig.expression,
          timezone: trigger.scheduleConfig.timezone || 'Asia/Tokyo',
          inputMessage: trigger.prompt,
        });
      }
    } else {
      setFormData({
        name: '',
        description: '',
        agentId: '',
        cronExpression: '0 0 * * ? *',
        timezone: 'Asia/Tokyo',
        inputMessage: '',
      });
    }
  }, [trigger]);

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error(t('triggers.form.nameRequired'));
      return false;
    }

    if (!formData.agentId) {
      toast.error(t('triggers.form.agentRequired'));
      return false;
    }

    if (!formData.inputMessage.trim()) {
      toast.error(t('triggers.form.inputMessageRequired'));
      return false;
    }

    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode) {
        // Update existing trigger
        const updateData: UpdateTriggerRequest = {
          name: formData.name,
          description: formData.description || undefined,
          agentId: formData.agentId,
          prompt: formData.inputMessage,
          scheduleConfig: {
            expression: formData.cronExpression,
            timezone: formData.timezone,
          },
        };

        await updateTrigger(trigger.id, updateData);
        toast.success(t('triggers.messages.updateSuccess'));
      } else {
        // Create new trigger
        const createData: CreateTriggerRequest = {
          name: formData.name,
          description: formData.description || undefined,
          agentId: formData.agentId,
          type: 'schedule',
          prompt: formData.inputMessage,
          scheduleConfig: {
            expression: formData.cronExpression,
            timezone: formData.timezone,
          },
        };

        await createTrigger(createData);
        toast.success(t('triggers.messages.createSuccess'));
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Failed to save trigger:', error);
      toast.error(
        isEditMode ? t('triggers.messages.updateError') : t('triggers.messages.createError')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>
          {isEditMode ? t('triggers.form.editTitle') : t('triggers.form.createTitle')}
        </ModalTitle>
        <ModalCloseButton />
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Basic Info */}
          <TriggerBasicInfo
            name={formData.name}
            description={formData.description}
            agentId={formData.agentId}
            onNameChange={(name: string) => setFormData({ ...formData, name })}
            onDescriptionChange={(description: string) => setFormData({ ...formData, description })}
            onAgentIdChange={(agentId: string) => setFormData({ ...formData, agentId })}
            disabled={isSaving}
          />

          {/* Schedule Config */}
          <ScheduleConfig
            cronExpression={formData.cronExpression}
            timezone={formData.timezone}
            onCronChange={(cronExpression: string) => setFormData({ ...formData, cronExpression })}
            onTimezoneChange={(timezone: string) => setFormData({ ...formData, timezone })}
            disabled={isSaving}
          />

          {/* Input Message */}
          <InputMessageConfig
            inputMessage={formData.inputMessage}
            onChange={(inputMessage: string) => setFormData({ ...formData, inputMessage })}
            disabled={isSaving}
          />
        </div>
      </ModalContent>

      <ModalFooter>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('triggers.form.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('triggers.form.saving') : t('triggers.form.save')}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
