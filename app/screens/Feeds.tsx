import React from 'react';
import {
    Actionsheet,
    ActionsheetBackdrop,
    ActionsheetContent,
    ActionsheetDragIndicator,
    ActionsheetDragIndicatorWrapper,
    ActionsheetItem,
    ActionsheetItemText,
} from '@/components/ui/actionsheet';
import { Fab, FabIcon, FabLabel } from '@/components/ui/fab';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Button } from '@/components/ui/button';

const FeedsScreen = () => {
    const [showActionsheet, setShowActionsheet] = React.useState(false);
    const handleClose = () => setShowActionsheet(false);

    return (
        <>
            {/* <Button
                className='bg-background-50 rounded-md'
                onPress={() => setShowActionsheet(true)}
            > */}
            <Fab size="lg" placement="top right" isHovered={false} isDisabled={false} isPressed={false} onPress={() => setShowActionsheet(true)} >
                <AntDesign name="piechart" size={24} color="white" />
            </Fab >
            {/* </Button> */}

            {/* <Box
                className='bg-background-50 rounded-md'
                onPress={() => setShowActionsheet(true)}
            >
                <Fab size="lg" placement="top right" isHovered={true} isDisabled={false} isPressed={true} >
                </Fab>
            </Box> */}

            {/* ActionSheet content */}
            <Actionsheet isOpen={showActionsheet} onClose={handleClose}>
                <ActionsheetBackdrop />
                <ActionsheetContent>
                    <ActionsheetDragIndicatorWrapper>
                        <ActionsheetDragIndicator />
                    </ActionsheetDragIndicatorWrapper>
                    <ActionsheetItem onPress={handleClose}>
                        <ActionsheetItemText>Edit Message</ActionsheetItemText>
                    </ActionsheetItem>
                    <ActionsheetItem onPress={handleClose}>
                        <ActionsheetItemText>Mark Unread</ActionsheetItemText>
                    </ActionsheetItem>
                    <ActionsheetItem onPress={handleClose}>
                        <ActionsheetItemText>Remind Me</ActionsheetItemText>
                    </ActionsheetItem>
                </ActionsheetContent>
            </Actionsheet>
        </>
    );
};

export default FeedsScreen;
