/** Channel message registration helpers extracted from part-1. */
import {
  channelMessageHandlerUnregisterIndex,
  initialChannelMessageHandlerUnregisterState,
  initialChannelMessageTypeRegistrationState,
  initialRegisterChannelMessageHandlerState,
  shouldProceedChannelMessageTypeRegistration,
  shouldRegisterChannelMessageHandlerNow,
  shouldRejectChannelMessageTypeMissingMsgtype,
  shouldRejectChannelMessageTypeSystemReserved,
  shouldRemoveChannelMessageHandler,
  stepChannelMessageHandlerUnregisterWithActions,
  stepChannelMessageTypeRegistrationWithActions,
  stepRegisterChannelMessageHandlerWithActions,
} from "./protocol.js";
import {
  ChannelException,
  ChannelExceptionType,
  type ChannelMessageConstructor,
  type ChannelMessageHandler,
} from "./part-1-types.js";

export abstract class ChannelRegister {
  protected readonly messageCallbacks: ChannelMessageHandler[] = [];
  protected readonly messageFactories = new Map<
    number,
    ChannelMessageConstructor
  >();

  registerMessageType(
    messageClass: ChannelMessageConstructor,
    options: { readonly isSystemType?: boolean } = {},
  ): void {
    const { actions } = stepChannelMessageTypeRegistrationWithActions(
      initialChannelMessageTypeRegistrationState(),
      {
        kind: "channel/message-type-registration-gate",
        msgType: messageClass.MSGTYPE,
        isSystemType: options.isSystemType === true,
      },
    );
    if (shouldRejectChannelMessageTypeMissingMsgtype(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Message class lacks MSGTYPE",
      );
    }
    if (shouldRejectChannelMessageTypeSystemReserved(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Message type is system-reserved",
      );
    }
    if (!shouldProceedChannelMessageTypeRegistration(actions)) {
      throw new ChannelException(
        ChannelExceptionType.ME_INVALID_MSG_TYPE,
        "Message type registration rejected",
      );
    }

    this.messageFactories.set(messageClass.MSGTYPE, messageClass);
  }

  addMessageHandler(callback: ChannelMessageHandler): void {
    if (
      shouldRegisterChannelMessageHandlerNow(
        stepRegisterChannelMessageHandlerWithActions(
          initialRegisterChannelMessageHandlerState(),
          {
            kind: "channel/register-message-handler-gate",
            alreadyPresent: this.messageCallbacks.includes(callback),
          },
        ).actions,
      )
    ) {
      this.messageCallbacks.push(callback);
    }
  }

  removeMessageHandler(callback: ChannelMessageHandler): void {
    const stepped = stepChannelMessageHandlerUnregisterWithActions(
      initialChannelMessageHandlerUnregisterState(),
      {
        kind: "channel/message-handler-unregister-gate",
        index: this.messageCallbacks.indexOf(callback),
      },
    );
    const index = channelMessageHandlerUnregisterIndex(stepped.actions);
    if (shouldRemoveChannelMessageHandler(stepped.actions) && index !== null) {
      this.messageCallbacks.splice(index, 1);
    }
  }
}
